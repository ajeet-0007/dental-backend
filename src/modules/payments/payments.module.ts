import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { VerifiedOnlyGuard } from '../../common/guards/verified-only.guard';
import { Payment, Order, OrderItem, PaymentIntent, User, Cart, Product, ProductVariant } from '../../database/entities';
import { InventoryModule } from '../inventory/inventory.module';
import { ShippingModule } from '../shipping/shipping.module';
import { OrderNotificationsModule } from '../order-notifications/order-notifications.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, OrderItem, PaymentIntent, User, Cart, Product, ProductVariant]),
    OrderNotificationsModule,
    forwardRef(() => InventoryModule),
    forwardRef(() => ShippingModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, VerifiedOnlyGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
