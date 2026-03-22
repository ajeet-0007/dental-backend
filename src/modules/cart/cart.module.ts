import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { Cart, Product, ProductVariant, Inventory } from '../../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, Product, ProductVariant, Inventory]),
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
