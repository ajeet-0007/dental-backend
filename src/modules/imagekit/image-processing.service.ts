import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { lookup } from "dns/promises";
import { isIP } from "net";
import * as path from "path";
import sharp, { Metadata } from "sharp";
import { ImageKitService, ImageKitUploadResult } from "./imagekit.service";

@Injectable()
export class ImageProcessingService {
  private readonly urlCache = new Map<string, string>();

  private static readonly URL_CACHE_LIMIT = 500;
  private static readonly UPLOAD_CONCURRENCY = 4;
  private static readonly MAX_FILE_BYTES = 5 * 1024 * 1024;
  private static readonly DEFAULT_MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024;
  private static readonly DEFAULT_FETCH_TIMEOUT_MS = 15000;
  private static readonly MAX_REDIRECTS = 5;
  private static readonly ALLOWED_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/avif",
    "image/tiff",
    "image/svg+xml",
  ]);

  constructor(
    private readonly configService: ConfigService,
    private readonly imageKitService: ImageKitService,
  ) {}

  async processFile(
    file: Express.Multer.File,
    folder = "/dentalkart",
    allowedMimeTypes?: string[],
  ): Promise<ImageKitUploadResult> {
    if (!file?.buffer?.length) {
      throw new BadRequestException("No image file provided");
    }

    const mimeType = (file.mimetype || "").toLowerCase();
    const allowed = allowedMimeTypes
      ? new Set(allowedMimeTypes)
      : ImageProcessingService.ALLOWED_MIME_TYPES;

    if (!allowed.has(mimeType)) {
      throw new BadRequestException(
        "Only image files (JPEG, PNG, WebP, GIF, AVIF, TIFF, SVG) are allowed",
      );
    }

    if (file.buffer.length > ImageProcessingService.MAX_FILE_BYTES) {
      throw new BadRequestException("File size must be less than 5MB");
    }

    return this.processBuffer(
      file.buffer,
      file.originalname || `image-${Date.now()}`,
      folder,
      ImageProcessingService.MAX_FILE_BYTES,
    );
  }

  async processBuffer(
    buffer: Buffer,
    fileName: string,
    folder = "/dentalkart",
    maxBytes = this.maxDownloadBytes,
  ): Promise<ImageKitUploadResult> {
    if (!buffer?.length) {
      throw new BadRequestException("No image file provided");
    }

    if (buffer.length > maxBytes) {
      throw new BadRequestException(
        `Image is too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB)`,
      );
    }

    const processed = await this.compressLossless(buffer, fileName);
    return this.imageKitService.uploadBuffer(
      processed.buffer,
      processed.fileName,
      folder,
    );
  }

  async processUrl(url: string, folder = "/dentalkart/products"): Promise<string> {
    const trimmed = (url || "").trim();
    if (!trimmed) {
      throw new BadRequestException("Image URL is required");
    }

    if (this.imageKitService.isImageKitUrl(trimmed)) {
      return trimmed;
    }

    const cached = this.urlCache.get(trimmed);
    if (cached) {
      return cached;
    }

    const remote = await this.downloadImage(trimmed);
    const uploaded = await this.processBuffer(remote.buffer, remote.fileName, folder);
    this.cacheUrl(trimmed, uploaded.url);

    return uploaded.url;
  }

  async processUrls(
    urls: (string | null | undefined)[] | null | undefined,
    folder = "/dentalkart/products",
  ): Promise<string[]> {
    if (!Array.isArray(urls)) {
      return [];
    }

    const images = urls
      .filter((url): url is string => typeof url === "string")
      .map((url) => url.trim())
      .filter(Boolean);

    const uniqueImages = Array.from(new Set(images));
    const uploadedUrls = await this.mapWithConcurrency(
      uniqueImages,
      ImageProcessingService.UPLOAD_CONCURRENCY,
      (url) => this.processUrl(url, folder),
    );

    const urlMap = new Map(
      uniqueImages.map((url, index) => [url, uploadedUrls[index]]),
    );

    return images.map((url) => urlMap.get(url)!);
  }

  async processOptionalUrl(
    url: string | null | undefined,
    folder = "/dentalkart/swatches",
  ): Promise<string | null> {
    if (typeof url !== "string" || !url.trim()) {
      return null;
    }

    return this.processUrl(url, folder);
  }

  private async compressLossless(
    buffer: Buffer,
    fileName: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    let metadata: Metadata;

    try {
      metadata = await sharp(buffer, { animated: true }).metadata();
    } catch (error) {
      throw new BadRequestException(
        `Unsupported or corrupt image file: ${this.errorMessage(error)}`,
      );
    }

    const format = metadata.format;
    if (!format) {
      throw new BadRequestException("Unsupported or corrupt image file");
    }

    if (format === "svg" || format === "gif") {
      return { buffer, fileName: this.ensureExtension(fileName, format) };
    }

    const targetFormat = format === "heif" ? "avif" : format;

    try {
      const image = sharp(buffer, { animated: true }).rotate();
      let output: Buffer;

      switch (format) {
        case "jpeg":
          output = await image
            .jpeg({
              quality: 100,
              chromaSubsampling: "4:4:4",
              mozjpeg: true,
            })
            .toBuffer();
          break;
        case "png":
          output = await image
            .png({
              compressionLevel: 9,
              adaptiveFiltering: true,
              palette: false,
              effort: 10,
            })
            .toBuffer();
          break;
        case "webp":
          output = await image
            .webp({ lossless: true, effort: 6 })
            .toBuffer();
          break;
        case "heif":
          output = await image
            .avif({ lossless: true, effort: 9 })
            .toBuffer();
          break;
        case "tiff":
          output = await image.tiff({ compression: "lzw" }).toBuffer();
          break;
        default:
          return {
            buffer,
            fileName: this.ensureExtension(fileName, targetFormat),
          };
      }

      if (!output.length || output.length >= buffer.length) {
        return { buffer, fileName: this.ensureExtension(fileName, targetFormat) };
      }

      return {
        buffer: output,
        fileName: this.ensureExtension(fileName, targetFormat),
      };
    } catch (error) {
      throw new BadRequestException(
        `Failed to compress image: ${this.errorMessage(error)}`,
      );
    }
  }

  private async downloadImage(
    rawUrl: string,
  ): Promise<{ buffer: Buffer; fileName: string }> {
    let url: URL;
    try {
      url = new URL(rawUrl);
    } catch {
      throw new BadRequestException(`Invalid image URL: ${rawUrl}`);
    }

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new BadRequestException(
        `Only http(s) image URLs are supported: ${rawUrl}`,
      );
    }

    if (url.username || url.password) {
      throw new BadRequestException("Image URLs with credentials are not allowed");
    }

    const originalFileName = this.fileNameFromUrl(url);
    const timeoutMs = this.fetchTimeoutMs;
    const maxBytes = this.maxDownloadBytes;

    for (let redirects = 0; redirects <= ImageProcessingService.MAX_REDIRECTS; redirects++) {
      await this.assertSafeRemoteUrl(url);

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url.toString(), {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            Accept: "image/*",
            "User-Agent": "Dentalkart-Image-Processor/1.0",
          },
        });

        if (this.isRedirect(response.status)) {
          const location = response.headers.get("location");
          if (!location) {
            throw new BadRequestException(
              `Image download redirected without a location: ${url.toString()}`,
            );
          }

          url = new URL(location, url);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            throw new BadRequestException(
              `Image redirect to an unsupported protocol: ${url.toString()}`,
            );
          }
          continue;
        }

        if (!response.ok) {
          throw new BadRequestException(
            `Failed to download image (${response.status}): ${url.toString()}`,
          );
        }

        const contentType = (response.headers.get("content-type") || "")
          .split(";")[0]
          .trim()
          .toLowerCase();

        if (contentType && !contentType.startsWith("image/")) {
          throw new BadRequestException(
            `URL does not point to an image (${contentType}): ${url.toString()}`,
          );
        }

        const contentLength = Number(response.headers.get("content-length") || 0);
        if (contentLength > maxBytes) {
          throw new BadRequestException(
            `Image is too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB): ${url.toString()}`,
          );
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        if (!buffer.length) {
          throw new BadRequestException(
            `Downloaded image is empty: ${url.toString()}`,
          );
        }

        if (buffer.length > maxBytes) {
          throw new BadRequestException(
            `Image is too large (max ${Math.floor(maxBytes / (1024 * 1024))}MB): ${url.toString()}`,
          );
        }

        return { buffer, fileName: originalFileName };
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }

        if (controller.signal.aborted) {
          throw new BadRequestException(
            `Timed out downloading image: ${url.toString()}`,
          );
        }

        throw new BadRequestException(
          `Failed to download image ${url.toString()}: ${this.errorMessage(error)}`,
        );
      } finally {
        clearTimeout(timer);
      }
    }

    throw new BadRequestException(
      `Too many redirects while downloading image: ${rawUrl}`,
    );
  }

  private async assertSafeRemoteUrl(url: URL): Promise<void> {
    if (this.allowPrivateHosts) {
      return;
    }

    const hostname = url.hostname
      .replace(/^\[/, "")
      .replace(/\]$/, "")
      .toLowerCase();

    if (!hostname) {
      throw new BadRequestException("Image URL must include a host");
    }

    if (
      hostname === "localhost" ||
      hostname.endsWith(".localhost") ||
      hostname.endsWith(".local") ||
      hostname.endsWith(".internal")
    ) {
      throw new BadRequestException(
        `Image URL uses a private host: ${url.toString()}`,
      );
    }

    if (isIP(hostname)) {
      if (this.isPrivateIp(hostname)) {
        throw new BadRequestException(
          `Image URL uses a private address: ${url.toString()}`,
        );
      }
      return;
    }

    let addresses: { address: string }[];
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      throw new BadRequestException(
        `Could not resolve image host: ${hostname}`,
      );
    }

    if (
      addresses.length === 0 ||
      addresses.some((entry) => this.isPrivateIp(entry.address))
    ) {
      throw new BadRequestException(
        `Image URL resolves to a private address: ${url.toString()}`,
      );
    }
  }

  private isPrivateIp(ip: string): boolean {
    const version = isIP(ip);

    if (version === 4) {
      const parts = ip.split(".").map((part) => Number(part));
      const [a, b] = parts;

      return (
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168)
      );
    }

    if (version === 6) {
      const normalized = ip.toLowerCase();

      if (normalized === "::" || normalized === "::1") {
        return true;
      }

      if (
        normalized.startsWith("fc") ||
        normalized.startsWith("fd") ||
        normalized.startsWith("fe8") ||
        normalized.startsWith("fe9") ||
        normalized.startsWith("fea") ||
        normalized.startsWith("feb")
      ) {
        return true;
      }

      if (normalized.startsWith("::ffff:")) {
        return this.isPrivateIp(normalized.substring(7));
      }
    }

    return false;
  }

  private isRedirect(status: number): boolean {
    return [301, 302, 303, 307, 308].includes(status);
  }

  private fileNameFromUrl(url: URL): string {
    const rawName = url.pathname.split("/").filter(Boolean).pop() || "";

    let decoded = rawName;
    try {
      decoded = decodeURIComponent(rawName);
    } catch {
      decoded = rawName;
    }

    const safeName = decoded
      .replace(/[^a-zA-Z0-9._-]+/g, "_")
      .replace(/^_+|_+$/g, "");

    if (!safeName) {
      return `image-${Date.now()}`;
    }

    if (safeName.length <= 120) {
      return safeName;
    }

    const extension = path.extname(safeName).slice(0, 10);
    return `${safeName.slice(0, 110)}${extension}`;
  }

  private ensureExtension(fileName: string, format: string): string {
    const extension = this.extensionForFormat(format);
    const baseName = path.basename(fileName || `image-${Date.now()}`);

    if (!extension) {
      return baseName;
    }

    const currentExtension = path.extname(baseName).toLowerCase();
    if (
      currentExtension === `.${extension}` ||
      (extension === "jpg" && currentExtension === ".jpeg")
    ) {
      return baseName;
    }

    if (!currentExtension) {
      return `${baseName}.${extension}`;
    }

    return `${baseName.slice(0, -currentExtension.length)}.${extension}`;
  }

  private extensionForFormat(format: string): string | null {
    switch (format) {
      case "jpeg":
        return "jpg";
      case "png":
        return "png";
      case "webp":
        return "webp";
      case "avif":
        return "avif";
      case "gif":
        return "gif";
      case "tiff":
        return "tiff";
      case "svg":
        return "svg";
      default:
        return null;
    }
  }

  private cacheUrl(source: string, uploaded: string): void {
    if (this.urlCache.size >= ImageProcessingService.URL_CACHE_LIMIT) {
      const oldest = this.urlCache.keys().next().value;
      if (oldest) {
        this.urlCache.delete(oldest);
      }
    }

    this.urlCache.set(source, uploaded);
  }

  private async mapWithConcurrency<T, R>(
    items: T[],
    limit: number,
    fn: (item: T, index: number) => Promise<R>,
  ): Promise<R[]> {
    const results = new Array<R>(items.length);
    let nextIndex = 0;

    const workers = Array.from(
      { length: Math.min(Math.max(limit, 1), items.length) },
      async () => {
        while (true) {
          const index = nextIndex++;
          if (index >= items.length) {
            return;
          }
          results[index] = await fn(items[index], index);
        }
      },
    );

    await Promise.all(workers);
    return results;
  }

  private get maxDownloadBytes(): number {
    const configured = Number(
      this.configService.get<string>("IMAGE_MAX_DOWNLOAD_BYTES"),
    );

    return Number.isFinite(configured) && configured > 0
      ? configured
      : ImageProcessingService.DEFAULT_MAX_DOWNLOAD_BYTES;
  }

  private get fetchTimeoutMs(): number {
    const configured = Number(
      this.configService.get<string>("IMAGE_FETCH_TIMEOUT_MS"),
    );

    return Number.isFinite(configured) && configured > 0
      ? configured
      : ImageProcessingService.DEFAULT_FETCH_TIMEOUT_MS;
  }

  private get allowPrivateHosts(): boolean {
    return (
      this.configService.get<string>("IMAGE_ALLOW_PRIVATE_HOSTS") === "true"
    );
  }

  private errorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}
