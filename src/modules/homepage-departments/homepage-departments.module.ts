import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HomepageDepartment, Department, Product } from "../../database/entities";
import { HomepageDepartmentsController } from "./homepage-departments.controller";
import { HomepageDepartmentsService } from "./homepage-departments.service";

@Module({
  imports: [TypeOrmModule.forFeature([HomepageDepartment, Department, Product])],
  controllers: [HomepageDepartmentsController],
  providers: [HomepageDepartmentsService],
  exports: [HomepageDepartmentsService],
})
export class HomepageDepartmentsModule {}
