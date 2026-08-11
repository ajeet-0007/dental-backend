import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HomepageBrand, Brand, Product } from "../../database/entities";
import { HomepageBrandsController } from "./homepage-brands.controller";
import { HomepageBrandsService } from "./homepage-brands.service";

@Module({
  imports: [TypeOrmModule.forFeature([HomepageBrand, Brand, Product])],
  controllers: [HomepageBrandsController],
  providers: [HomepageBrandsService],
  exports: [HomepageBrandsService],
})
export class HomepageBrandsModule {}
