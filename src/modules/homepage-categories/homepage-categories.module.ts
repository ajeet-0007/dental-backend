import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HomepageCategory, Category, Product } from "../../database/entities";
import { HomepageCategoriesController } from "./homepage-categories.controller";
import { HomepageCategoriesService } from "./homepage-categories.service";

@Module({
  imports: [TypeOrmModule.forFeature([HomepageCategory, Category, Product])],
  controllers: [HomepageCategoriesController],
  providers: [HomepageCategoriesService],
  exports: [HomepageCategoriesService],
})
export class HomepageCategoriesModule {}
