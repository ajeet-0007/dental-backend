import { Module, NestModule, MiddlewareConsumer } from "@nestjs/common";
import { RawBodyMiddleware } from "./middleware/raw-body.middleware";

@Module({})
export class CommonModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(RawBodyMiddleware)
      .forRoutes("/api/payments/webhook");
  }
}