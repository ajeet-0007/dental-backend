import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { Order } from "../../database/entities/order.entity";
import { Payment } from "../../database/entities/payment.entity";
import { Product } from "../../database/entities/product.entity";
import { User } from "../../database/entities/user.entity";
import { OrderItem } from "../../database/entities/order-item.entity";
import { Inventory } from "../../database/entities/inventory.entity";
import { Category } from "../../database/entities/category.entity";
import { ProductOption } from "../../database/entities/product-option.entity";
import { ProductOptionValue } from "../../database/entities/product-option-value.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Payment,
      Product,
      User,
      OrderItem,
      Inventory,
      Category,
      ProductOption,
      ProductOptionValue,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
