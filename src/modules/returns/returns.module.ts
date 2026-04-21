import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReturnsService } from './returns.service';
import { ReturnsController } from './returns.controller';
import { AdminReturnsController } from './admin-returns.controller';
import {
  ReturnShipment,
  ReturnItem,
  ReturnTimeline,
  Order,
  Shipment,
  Payment,
  OrderItem,
} from '../../database/entities';
import { ShippingModule } from '../shipping/shipping.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReturnShipment,
      ReturnItem,
      ReturnTimeline,
      Order,
      Shipment,
      Payment,
      OrderItem,
    ]),
    forwardRef(() => ShippingModule),
  ],
  controllers: [ReturnsController, AdminReturnsController],
  providers: [ReturnsService],
  exports: [ReturnsService],
})
export class ReturnsModule {}
