import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { News } from "../../database/entities/news.entity";

interface TavilyResult {
  title?: string;
  url?: string;
  content?: string;
  score?: number;
  published_date?: string;
  images?: string[];
  favicon?: string;
}

interface TavilyResponse {
  results?: TavilyResult[];
}

const TAVILY_ENDPOINT = "https://api.tavily.com/search";

const IMAGE_DENY = [
  "logo",
  "icon",
  "sprite",
  "avatar",
  "favicon",
  "badge",
  "gravatar",
  "placeholder",
  "spinner",
  "1x1",
  "blank.gif",
];

function isUsableImage(url: string): boolean {
  if (!url || typeof url !== "string") return false;
  if (!/^https?:\/\//i.test(url)) return false;
  const lower = url.toLowerCase();
  if (IMAGE_DENY.some((token) => lower.includes(token))) return false;
  // Wikimedia/Unsplash thumb paths are always tiny
  if (/\/thumb\/|\/w\/\d{1,3}\.|\?w=\d{1,3}(&|$)/i.test(url)) return false;
  return true;
}

function pickImage(images: string[] | undefined): string {
  if (!images?.length) return "";
  return images.find(isUsableImage) ?? "";
}

function domainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function parsePublishedDate(value: string | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const JUNK_BLOCK =
  /^(?:references?|sources?|further reading|related articles?|share|save|comment|read more|contact info|follow us|about us|about the author|contributors?|tags?|categories|advertisement|newsletter|subscribe|privacy policy|terms of (?:use|service)|copyright|all rights reserved|home\/?[a-z ]*|news\s|menu|search|home)$/i;

const MASTHEAD_BLURB =
  /\bis (?:the )?(?:world'?s|nation'?s|global|leading|number one|#1)\b|here you can (?:get|find|read)|subscr(i|ibe)be? to (?:our|the)|\ball rights reserved\b/i;

const DATELINE_ONLY =
  /^(?:news\s+)?(?:mon|tue|tues|wed|thu|thur|thurs|fri|sat|sun)[a-z]*\.?\s+\d{1,2}[.,]?\s+\w+\s+\d{4}\s*$/i;

const CITATION = /^\d{1,2}\.\s+\S.*(?:press release|\b(?:19|20)\d{2}\b)/i;

const BYLINE =
  /^(?:clinical input|contributors?|words by|images:|photo:|photographs?:|reporting by|\S+(?:\s+\S+){0,4},\s+(?:dental|editor|reporter|photo))/i;

const JSON_BLOB = /[{([][\s\S]{0,400}?[}\])]/g;

function looksLikeData(value: string): boolean {
  return /\\?"\s*:\s*\\?["'[\d]/.test(value);
}

function stripMarkdown(block: string): string {
  return block
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^[\s#>*_`\-]+|[*_`]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isJunkBlock(block: string, title: string): boolean {
  if (!block) return true;
  if (looksLikeData(block)) return true;
  if (DATELINE_ONLY.test(block)) return true;
  if (CITATION.test(block)) return true;
  if (BYLINE.test(block)) return true;
  if (MASTHEAD_BLURB.test(block)) return true;
  // "[...]" marks a Tavily elision, so anything around it is a fragment
  if (/\[\.{2,}\]/.test(block)) return true;

  const bare = block.replace(/[\s:.]+$/, "");
  if (JUNK_BLOCK.test(bare)) return true;

  const normalized = bare.toLowerCase();
  const normalizedTitle = title.toLowerCase();
  if (normalizedTitle && normalized.startsWith(normalizedTitle.slice(0, 40)))
    return true;
  if (normalized.length < 30 && !/[.!?]$/.test(bare)) return true;

  return false;
}

/**
 * Tavily returns a raw page scrape, so the lede has to be picked out of
 * navigation, bylines, datelines and embedded JSON-LD. Returns "" when no block
 * is a trustworthy excerpt - a blank summary beats a garbled one.
 */
function buildSummary(
  content: string | undefined,
  title: string,
  maxLength: number,
): string {
  if (!content) return "";
  const cleanTitle = stripMarkdown(title ?? "");

  const blocks = content
    .split(/\n{2,}|\n(?=[A-Z#])/)
    .map(stripMarkdown)
    .filter(Boolean);

  const prose = blocks.filter((block) => {
    if (isJunkBlock(block, cleanTitle)) return false;
    const words = block.split(/\s+/).length;
    return words >= 8 && /[.!?]/.test(block);
  });

  if (!prose.length) return "";

  let summary = prose[0];
  if (summary.length > maxLength) {
    const cut = summary.slice(0, maxLength - 3);
    const lastSpace = cut.lastIndexOf(" ");
    summary = `${cut.slice(0, lastSpace > maxLength * 0.6 ? lastSpace : maxLength - 3)}...`;
  }
  return summary;
}

/**
 * Tavily often appends the publisher to the title ("... | Dentistry IQ"). We
 * already surface `source` separately, so drop the suffix when it matches the
 * article's own domain.
 */
function stripTitleSuffix(title: string, domain: string): string {
  if (!domain || !title) return title;
  const domainTokens = new Set(
    domain
      .toLowerCase()
      .replace(/\.(com|net|org|co|io|uk|in|news|blog)$/i, "")
      .split(/[^a-z0-9]+/)
      .filter(Boolean),
  );
  if (!domainTokens.size) return title;

  let output = title;
  for (let i = 0; i < 3; i += 1) {
    const suffix = output.match(
      /\s+[|\u2013\u2014-]\s+([^-|\u2013\u2014]{2,40})$/,
    );
    if (!suffix) break;
    const tokens = suffix[1]
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
    if (!tokens.some((token) => domainTokens.has(token))) break;
    output = output.slice(0, suffix.index).trim();
  }
  return output;
}

@Injectable()
export class NewsCronService {
  private readonly logger = new Logger(NewsCronService.name);
  private readonly apiKey: string | undefined;

  private readonly NEWS_QUERY = "dental industry news";
  private readonly NEWS_COUNT = 10;
  private readonly NEWS_DAYS = 14;
  private readonly RETENTION_DAYS = 60;

  constructor(
    @InjectRepository(News)
    private newsRepository: Repository<News>,
    private configService: ConfigService,
  ) {
    this.apiKey = this.configService.get("TAVILY_API_KEY");
    if (this.apiKey) {
      this.logger.log("Tavily API configured");
    } else {
      this.logger.warn("TAVILY_API_KEY not configured - news fetch disabled");
    }
  }

  private async searchTavily(): Promise<TavilyResponse> {
    const response = await fetch(TAVILY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query: this.NEWS_QUERY,
        topic: "news",
        search_depth: "advanced",
        days: this.NEWS_DAYS,
        include_images: true,
        max_results: this.NEWS_COUNT * 2,
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      throw new Error(
        `Tavily responded ${response.status} ${response.statusText}`,
      );
    }
    return (await response.json()) as TavilyResponse;
  }

  async doFetchNews(): Promise<void> {
    if (!this.apiKey) {
      this.logger.error("Tavily API key missing - skipping fetch");
      return;
    }

    try {
      const result = await this.searchTavily();

      const results: TavilyResult[] = result?.results ?? [];
      if (!results.length) {
        this.logger.warn(
          "Tavily returned no results - keeping existing articles",
        );
        return;
      }

      const ranked = results
        .filter((item) => item?.url && item?.title)
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

      const existing = await this.newsRepository.find({
        select: { id: true, sourceUrl: true },
      });
      const seenUrls = new Set(
        existing.map((row) => row.sourceUrl).filter(Boolean),
      );

      const duplicates = ranked.filter((item) => seenUrls.has(item.url!));
      const fresh = ranked.filter((item) => !seenUrls.has(item.url!));

      this.logger.log(
        `Fetched ${ranked.length} (${fresh.length} new, ${duplicates.length} already stored)`,
      );

      const now = new Date();

      if (fresh.length) {
        await this.newsRepository.save(
          fresh.slice(0, this.NEWS_COUNT).map((item) => {
            const source = domainFromUrl(item.url!);
            const title = stripTitleSuffix(
              stripMarkdown(item.title ?? ""),
              source,
            ).slice(0, 255);
            return this.newsRepository.create({
              title,
              subtitle: buildSummary(item.content, title, 220),
              content: stripMarkdown(item.content ?? ""),
              image: pickImage(item.images),
              sourceUrl: item.url,
              source,
              publishedAt: parsePublishedDate(item.published_date) ?? now,
              isActive: true,
            });
          }),
        );
        this.logger.log(
          `Inserted ${Math.min(fresh.length, this.NEWS_COUNT)} new articles`,
        );
      }

      const cutoff = new Date(
        now.getTime() - this.RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      await this.pruneOld(cutoff);
    } catch (error) {
      this.logger.error("Failed to fetch dental news:", error.message);
    }
  }

  private async pruneOld(cutoff: Date): Promise<void> {
    try {
      const { affected } = await this.newsRepository
        .createQueryBuilder()
        .delete()
        .where("publishedAt < :cutoff", { cutoff })
        .execute();
      if (affected) {
        this.logger.log(
          `Pruned ${affected} articles older than ${this.RETENTION_DAYS} days`,
        );
      }
    } catch (error) {
      this.logger.error("Failed to prune old news:", error.message);
    }
  }

  async getLatestNews(): Promise<News[]> {
    try {
      return await this.newsRepository.find({
        where: { isActive: true },
        order: { publishedAt: "DESC" },
        take: this.NEWS_COUNT,
      });
    } catch (err) {
      this.logger.error(`getLatestNews error: ${err.message}`);
      return [];
    }
  }

  async triggerFetch(): Promise<{ message: string; count: number }> {
    await this.doFetchNews();
    const news = await this.getLatestNews();
    return { message: "News fetch completed", count: news.length };
  }
}
