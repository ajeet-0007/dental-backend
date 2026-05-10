import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Department } from '../../database/entities/department.entity';
import { Brand } from '../../database/entities/brand.entity';
import { Category } from '../../database/entities/category.entity';
import { EntityBulkUploadController } from './entity-bulk-upload.controller';
import { DepartmentsBulkService } from './services/departments-bulk.service';
import { BrandsBulkService } from './services/brands-bulk.service';
import { CategoriesBulkService } from './services/categories-bulk.service';

@Module({
  imports: [TypeOrmModule.forFeature([Department, Brand, Category])],
  controllers: [EntityBulkUploadController],
  providers: [DepartmentsBulkService, BrandsBulkService, CategoriesBulkService],
  exports: [DepartmentsBulkService, BrandsBulkService, CategoriesBulkService],
})
export class EntityBulkUploadModule {}