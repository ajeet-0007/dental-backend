import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { OrdersService } from "./orders.service";
import { OrdersController } from "./orders.controller";
import { VerifiedOnlyGuard } from "../../common/guards/verified-only.guard";
import {
  Order,
  OrderItem,
  Cart,
  Product,
  ProductVariant,
  Inventory,
  Address,
  Payment,
  Shipment,
  ShipmentTrackingHistory,
  User,
} from "../../database/entities";
import { InventoryModule } from "../inventory/inventory.module";
import { ShippingModule } from "../shipping/shipping.module";

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
      Shipment,
      ShipmentTrackingHistory,
      User,
    ]),
    forwardRef(() => InventoryModule),
    forwardRef(() => ShippingModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, VerifiedOnlyGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
