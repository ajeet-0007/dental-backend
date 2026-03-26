import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductVariant, Inventory, Category } from '../../database/entities';
import { ProductOption } from '../../database/entities/product-option.entity';
import { ProductOptionValue } from '../../database/entities/product-option-value.entity';
import { VariantOption } from '../../database/entities/variant-option.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product, 
      ProductVariant, 
      Inventory, 
      Category, 
      ProductOption, 
      ProductOptionValue, 
      VariantOption
    ]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
