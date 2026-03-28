import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { ProductsModule } from "./modules/products/products.module";
import { InventoryModule } from "./modules/inventory/inventory.module";
import { CartModule } from "./modules/cart/cart.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ShippingModule } from "./modules/shipping/shipping.module";
import { AdminModule } from "./modules/admin/admin.module";
import { ImageKitModule } from "./modules/imagekit/imagekit.module";
import { HealthModule } from "./modules/health/health.module";
import { WishlistModule } from "./modules/wishlist/wishlist.module";
import { BannersModule } from "./modules/banners/banners.module";
import { DepartmentsModule } from "./modules/departments/departments.module";
import { BrandsModule } from "./modules/brands/brands.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    MulterModule.register({
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        type: "mysql",
        host: configService.get("MYSQL_DATABASE_HOST"),
        port: configService.get("MYSQL_DATABASE_PORT"),
        username: configService.get("MYSQL_DATABASE_USER"),
        password: configService.get("MYSQL_DATABASE_PASSWORD"),
        database: configService.get("MYSQL_DATABASE_NAME"),
        entities: [__dirname + "/database/entities/*.entity{.ts,.js}"],
        synchronize: false,
        logging: configService.get("NODE_ENV") === "development",
        connectTimeout: 30000,
        acquireTimeout: 30000,
        extra: {
          connectionLimit: 10,
        },
      }),
      inject: [ConfigService],
    }),
    HealthModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    CategoriesModule,
    ProductsModule,
    InventoryModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    ShippingModule,
    AdminModule,
    ImageKitModule,
    WishlistModule,
    BannersModule,
    DepartmentsModule,
    BrandsModule,
  ],
})
export class AppModule {}
