import { Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { UserRole } from "../../database/entities";
import { Roles } from "../../common/decorators/roles.decorator";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
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
        source: item.source,
        publishedAt: item.publishedAt,
      })),
    };
  }

  @Post("fetch")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Manually trigger news fetch (Admin only)" })
  async triggerFetch() {
    return this.newsCronService.triggerFetch();
  }
}
