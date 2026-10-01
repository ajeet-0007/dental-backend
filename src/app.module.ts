import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MulterModule } from "@nestjs/platform-express";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { GoogleRecaptchaModule } from "@nestlab/google-recaptcha";
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
import { HomepageBrandsModule } from "./modules/homepage-brands/homepage-brands.module";
import { HomepageCategoriesModule } from "./modules/homepage-categories/homepage-categories.module";
import { HomepageDepartmentsModule } from "./modules/homepage-departments/homepage-departments.module";
import { ReviewsModule } from "./modules/reviews/reviews.module";
import { EmailModule } from "./modules/email/email.module";
import { ReturnsModule } from "./modules/returns/returns.module";
import { NewsModule } from "./modules/news/news.module";
import { BrevoModule } from "./modules/brevo/brevo.module";
import { GalleryModule } from "./modules/gallery/gallery.module";

import { AiAssistantModule } from "./modules/ai-assistant/ai-assistant.module";
import { BulkUploadModule } from "./modules/bulk-upload/bulk-upload.module";
import { EntityBulkUploadModule } from "./modules/entity-bulk-upload/entity-bulk-upload.module";
import { ProfessionalVerificationModule } from "./modules/professional-verification/professional-verification.module";
import { LoggerModule } from "./modules/logger/logger.module";
import { SupportModule } from "./modules/support/support.module";
import { AdviceRequestsModule } from "./modules/advice-requests/advice-requests.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      ignoreEnvFile: process.env.VERCEL === '1',
    }),
    ThrottlerModule.forRoot({
      throttlers: [
        {
          name: "default",
          ttl: 60000,
          limit: 100,
        },
      ],
    }),
    GoogleRecaptchaModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secretKey: configService.get("GOOGLE_RECAPTCHA_SECRET_KEY"),
        response: (req: any) => req.headers["recaptcha"] as string,
        skipIf: configService.get("NODE_ENV") !== "production",
      }),
      inject: [ConfigService],
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
        retryAttempts: 3,
        retryDelay: 3000,
        // Pool sizing must go in `extra`, which TypeORM forwards to mysql2 - the
        // top-level `pool` option is Postgres-only and is silently ignored here.
        // Each deployed instance opens its own pool and the server caps the total
        // (76 on the current Aiven plan), so keep the per-instance footprint small
        // and let idle connections expire rather than accumulate.
        extra: {
          connectionLimit: parseInt(configService.get("DB_POOL_MAX") || "3", 10),
          queueLimit: 0,
          waitForConnections: true,
          idleTimeout: 30000,
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
    EmailModule,
    ShippingModule,
    AdminModule,
    ImageKitModule,
    WishlistModule,
    BannersModule,
    DepartmentsModule,
    BrandsModule,
    HomepageBrandsModule,
    HomepageCategoriesModule,
    HomepageDepartmentsModule,
    ReviewsModule,
    ReturnsModule,
    NewsModule,
    AiAssistantModule,
    BulkUploadModule,
    EntityBulkUploadModule,
    ProfessionalVerificationModule,
    LoggerModule,
    BrevoModule,
    GalleryModule,
    SupportModule,
    AdviceRequestsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}