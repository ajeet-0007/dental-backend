import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";

export interface ImageKitUploadResult {
  url: string;
  fileId: string;
  name: string;
  thumbnailUrl?: string;
}

@Injectable()
export class ImageKitService {
  private readonly logger = new Logger(ImageKitService.name);
  private static readonly DELETE_CHUNK_SIZE = 100;
  private static readonly UPLOAD_ENDPOINT =
    "https://upload.imagekit.io/api/v1/files/upload";

  constructor(private configService: ConfigService) {}

  getPublicKey(): string {
    return this.configService.get<string>("IMAGEKIT_PUBLIC_KEY") || "";
  }

  getPrivateKey(): string {
    return this.configService.get<string>("IMAGEKIT_PRIVATE_KEY") || "";
  }

  getUrlEndpoint(): string {
    return this.configService.get<string>("IMAGEKIT_URL_ENDPOINT") || "";
  }

  getAuthParams(): { token: string; expire: number; signature: string } {
    const token = crypto.randomUUID();
    const expire = Math.floor(Date.now() / 1000) + 3500;
    const privateKey = this.getPrivateKey();

    const signature = crypto
      .createHmac("sha1", privateKey)
      .update(token + expire)
      .digest("hex");

    return {
      token,
      expire,
      signature,
    };
  }

  async uploadBuffer(
    buffer: Buffer,
    fileName: string,
    folder = "/dentalkart",
  ): Promise<ImageKitUploadResult> {
    const publicKey = this.getPublicKey();
    const privateKey = this.getPrivateKey();

    if (!publicKey || !privateKey) {
      throw new BadRequestException("ImageKit is not configured");
    }

    const authParams = this.getAuthParams();
    const formData = new FormData();
    formData.append("file", buffer.toString("base64"));
    formData.append("fileName", fileName);
    formData.append("publicKey", publicKey);
    formData.append("token", authParams.token);
    formData.append("expire", authParams.expire.toString());
    formData.append("signature", authParams.signature);
    formData.append("folder", folder);

    const response = await fetch(ImageKitService.UPLOAD_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    const result = (await response.json()) as {
      url?: string;
      fileId?: string;
      name?: string;
      thumbnailUrl?: string;
      message?: string;
    };

    if (!response.ok || !result.url) {
      throw new BadRequestException(result.message || "ImageKit upload failed");
    }

    return {
      url: result.url,
      fileId: result.fileId || "",
      name: result.name || fileName,
      thumbnailUrl: result.thumbnailUrl,
    };
  }

  isImageKitUrl(url: string): boolean {
    const endpoint = this.getUrlEndpoint().replace(/\/+$/, "");
    if (!endpoint) {
      return false;
    }

    return url === endpoint || url.startsWith(`${endpoint}/`);
  }

  private getFileIdFromUrl(url: string): string | null {
    const endpoint = this.getUrlEndpoint();
    if (!endpoint || !url || !url.startsWith(endpoint)) {
      return null;
    }

    const withoutQuery = url.split("?")[0].split("#")[0];
    const fileId = withoutQuery.substring(endpoint.length).replace(/^\/+/, "");

    return fileId || null;
  }

  private extractFileIds(
    urls: (string | null | undefined)[],
  ): string[] {
    const fileIds = new Set<string>();

    for (const url of urls || []) {
      if (!url) continue;
      const fileId = this.getFileIdFromUrl(url);
      if (fileId) {
        fileIds.add(fileId);
      }
    }

    return Array.from(fileIds);
  }

  async deleteFiles(
    urls: (string | null | undefined)[],
  ): Promise<void> {
    const fileIds = this.extractFileIds(urls);

    if (fileIds.length === 0) {
      return;
    }

    const privateKey = this.getPrivateKey();
    if (!privateKey) {
      this.logger.warn("IMAGEKIT_PRIVATE_KEY is not set; skipping file deletion");
      return;
    }

    const auth = `Basic ${Buffer.from(`${privateKey}:`).toString("base64")}`;

    try {
      for (
        let i = 0;
        i < fileIds.length;
        i += ImageKitService.DELETE_CHUNK_SIZE
      ) {
        const chunk = fileIds.slice(
          i,
          i + ImageKitService.DELETE_CHUNK_SIZE,
        );

        const response = await fetch(
          "https://api.imagekit.io/v1/files/batch/deleteByFileIds",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: auth,
            },
            body: JSON.stringify({ fileIds: chunk }),
          },
        );

        if (!response.ok) {
          const body = await response.text();
          this.logger.error(
            `ImageKit bulk delete failed (${response.status}): ${body}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        `Error deleting files from ImageKit (${fileIds.join(", ")}):`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
