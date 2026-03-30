import { DataSource } from "typeorm";
import { config } from "dotenv";
import { Product } from "../database/entities/product.entity";
import { ProductVariant } from "../database/entities/product-variant.entity";
import { ProductOption } from "../database/entities/product-option.entity";
import { ProductOptionValue } from "../database/entities/product-option-value.entity";
import { VariantOption } from "../database/entities/variant-option.entity";
import { Category } from "../database/entities/category.entity";
import { Brand } from "../database/entities/brand.entity";
import { Department } from "../database/entities/department.entity";
import { User } from "../database/entities/user.entity";
import { Address } from "../database/entities/address.entity";
import { Cart } from "../database/entities/cart.entity";
import { Order } from "../database/entities/order.entity";
import { OrderItem } from "../database/entities/order-item.entity";
import { Payment } from "../database/entities/payment.entity";
import { Shipment } from "../database/entities/shipment.entity";
import { Inventory } from "../database/entities/inventory.entity";
import { Review } from "../database/entities/review.entity";
import { Banner } from "../database/entities/banner.entity";
import { Wishlist } from "../database/entities/wishlist.entity";
import { ShippingMethod } from "../database/entities/shipping-method.entity";

config();

export const AppDataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_DATABASE_HOST || "localhost",
  port: parseInt(process.env.MYSQL_DATABASE_PORT || "3306"),
  username: process.env.MYSQL_DATABASE_USER || "root",
  password: process.env.MYSQL_DATABASE_PASSWORD || "",
  database: process.env.MYSQL_DATABASE_NAME || "dentalkart",
  entities: [
    Product,
    ProductVariant,
    ProductOption,
    ProductOptionValue,
    VariantOption,
    Category,
    Brand,
    Department,
    User,
    Address,
    Cart,
    Order,
    OrderItem,
    Payment,
    Shipment,
    Inventory,
    Review,
    Banner,
    Wishlist,
    ShippingMethod,
  ],
  migrations: [__dirname + "/../database/migrations/*{.ts,.js}"],
  synchronize: false,
  logging: true,
});
