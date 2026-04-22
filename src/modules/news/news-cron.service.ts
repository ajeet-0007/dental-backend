import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Cron, CronExpression } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Like, MoreThan } from "typeorm";
import { Banner } from "../../database/entities";
import { tavily } from "@tavily/core";

@Injectable()
export class NewsCronService {
  private readonly logger = new Logger(NewsCronService.name);
  private tavilyClient: any;
  private readonly NEWS_QUERY = "Latest dental industry news innovations treatments technology";
  private readonly NEWS_COUNT = 10;

  constructor(
    @InjectRepository(Banner)
    private bannerRepository: Repository<Banner>,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get("TAVILY_API_KEY");
    this.logger.log(`Config loaded. TAVILY_API_KEY exists: ${!!apiKey}`);
    if (apiKey) {
      this.tavilyClient = tavily({ apiKey });
      this.logger.log("Tavily API initialized");
    } else {
      this.logger.warn("TAVILY_API_KEY not configured");
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async fetchDentalNews(): Promise<void> {
    this.logger.log("Starting daily dental news fetch...");
    await this.doFetchNews();
  }

  async doFetchNews(): Promise<void> {
    if (!this.tavilyClient) {
      this.logger.error("Tavily client not initialized - skipping fetch");
      return;
    }

    try {
      const endDate = new Date().toISOString().split("T")[0];
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];

      this.logger.log(`Query: ${this.NEWS_QUERY}, Start: ${startDate}, End: ${endDate}`);

      const result = await this.tavilyClient.search(this.NEWS_QUERY, {
        includeAnswer: "advanced",
        searchDepth: "advanced",
        startDate,
        endDate,
        includeImages: true,
      });

      this.logger.log(`Tavily response keys: ${Object.keys(result).join(", ")}`);
      this.logger.log(`Tavily results count: ${result.results?.length || 0}`);
      this.logger.log(`First result: ${JSON.stringify(result.results?.[0]).substring(0, 200)}`);

      // Delete existing news banners (where link starts with "news:")
      await this.bannerRepository
        .createQueryBuilder()
        .delete()
        .where("link LIKE :prefix", { prefix: "news:%" })
        .execute();
      this.logger.log("Cleared existing news banners");

      // Insert new news as banners
      const newsItems = result.results?.slice(0, this.NEWS_COUNT) || [];
      const allImages = result.images || [];
      const now = new Date();

      for (let i = 0; i < newsItems.length; i++) {
        const item = newsItems[i];
        const imageUrl = allImages[i]?.url || "";

        const banner = this.bannerRepository.create({
          title: item.title?.substring(0, 255) || "Dental News",
          subtitle: this.truncateSummary(item.content, 200),
          image: imageUrl,
          link: `news:${item.url}`,
          isActive: true,
          sortOrder: i,
          endDate: now,
        });

        await this.bannerRepository.save(banner);
      }

      this.logger.log(`Saved ${newsItems.length} news articles`);
    } catch (error) {
      this.logger.error("Failed to fetch dental news:", error.message);
    }
  }

  private truncateSummary(content: string, maxLength: number): string {
    if (!content) return "";
    // Remove markdown headers
    const cleaned = content.replace(/^#+\s*/gm, "").replace(/\n+/g, " ").trim();
    if (cleaned.length <= maxLength) return cleaned;
    return cleaned.substring(0, maxLength - 3) + "...";
  }

  async getLatestNews(): Promise<Banner[]> {
    try {
      const news = await this.bannerRepository
        .createQueryBuilder("banner")
        .where("banner.link LIKE :prefix", { prefix: "news:%%" })
        .orderBy("banner.sortOrder", "ASC")
        .take(this.NEWS_COUNT)
        .getMany();
      this.logger.log(`getLatestNews found: ${news.length}`);
      return news;
    } catch (err) {
      this.logger.error(`getLatestNews error: ${err.message}`);
      return [];
    }
  }

  async triggerFetch(): Promise<{ message: string; count: number }> {
    try {
      await this.doFetchNews();
    } catch (err) {
      this.logger.error(`Trigger fetch error: ${err.message}`, err.stack);
    }
    const news = await this.getLatestNews();
    this.logger.log(`After fetch, news count: ${news.length}`);
    return { message: "News fetched", count: news.length };
  }
}