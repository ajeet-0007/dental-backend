import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import {
  Order,
  OrderItem,
  Cart,
  Product,
  ProductVariant,
  Inventory,
  Address,
  Payment,
} from "../../database/entities";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Cart,
      Product,
      ProductVariant,
      Inventory,
      Address,
      Payment,
    ]),
    forwardRef(() => InventoryModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
