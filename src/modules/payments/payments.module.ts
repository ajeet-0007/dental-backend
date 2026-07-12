import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { VerifiedOnlyGuard } from '../../common/guards/verified-only.guard';
import { Payment, Order, OrderItem, PaymentIntent, User, Cart } from '../../database/entities';
import { InventoryModule } from '../inventory/inventory.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, OrderItem, PaymentIntent, User, Cart]),
    forwardRef(() => InventoryModule),
    forwardRef(() => ShippingModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, VerifiedOnlyGuard],
  exports: [PaymentsService],
})
export class PaymentsModule {}
