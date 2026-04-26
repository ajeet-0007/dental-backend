import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NewsCronService } from "./news-cron.service";
import { NewsController } from "./news.controller";
import { News } from "../../database/entities/news.entity";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([News])],
  controllers: [NewsController],
  providers: [NewsCronService],
  exports: [NewsCronService],
})
export class NewsModule {}