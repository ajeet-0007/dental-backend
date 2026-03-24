import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductVariant, Inventory, Category } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Product, ProductVariant, Inventory, Category]),
  ],
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
