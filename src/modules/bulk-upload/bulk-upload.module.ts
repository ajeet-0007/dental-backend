import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BulkUploadController } from './bulk-upload.controller';
import { BulkUploadService } from './bulk-upload.service';
import { Product } from '../../database/entities/product.entity';
import { ProductVariant } from '../../database/entities/product-variant.entity';
import { ProductOption } from '../../database/entities/product-option.entity';
import { ProductOptionValue } from '../../database/entities/product-option-value.entity';
import { VariantOption } from '../../database/entities/variant-option.entity';
import { Inventory } from '../../database/entities/inventory.entity';
import { Category } from '../../database/entities/category.entity';
import { Brand } from '../../database/entities/brand.entity';
import { Department } from '../../database/entities/department.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      ProductOption,
      ProductOptionValue,
      VariantOption,
      Inventory,
      Category,
      Brand,
      Department,
    ]),
  ],
  controllers: [BulkUploadController],
  providers: [BulkUploadService],
  exports: [BulkUploadService],
})
export class BulkUploadModule {}
