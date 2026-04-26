import { Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { NewsCronService } from "./news-cron.service";

@ApiTags("News")
@Controller("news")
export class NewsController {
  constructor(private readonly newsCronService: NewsCronService) {}

  @Get("latest")
  @ApiOperation({ summary: "Get latest dental news" })
  async getLatestNews() {
    const news = await this.newsCronService.getLatestNews();
    return {
      articles: news.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        image: item.image,
        link: item.sourceUrl,
        publishedAt: item.publishedAt,
      })),
    };
  }

  @Post("fetch")
  @ApiOperation({ summary: "Manually trigger news fetch" })
  async triggerFetch() {
    return this.newsCronService.triggerFetch();
  }
}