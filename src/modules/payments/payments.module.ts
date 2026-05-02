import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { Payment, Order, OrderItem, PaymentIntent } from '../../database/entities';
import { InventoryModule } from '../inventory/inventory.module';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order, OrderItem, PaymentIntent]),
    forwardRef(() => InventoryModule),
    forwardRef(() => ShippingModule),
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
