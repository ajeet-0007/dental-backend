import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NewsCronService } from "./news-cron.service";
import { NewsController } from "./news.controller";
import { Banner } from "../../database/entities/banner.entity";

@Module({
  imports: [ConfigModule, TypeOrmModule.forFeature([Banner])],
  controllers: [NewsController],
  providers: [NewsCronService],
  exports: [NewsCronService],
})
export class NewsModule {}