import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShippingService } from './shipping.service';
import { ShippingController } from './shipping.controller';
import { ShippingWebhookController } from './shipping-webhook.controller';
import { ShippingRocketService } from './shipping-rocket.service';
import { ShippingRocketTestService } from './shipping.test-service';
import { ShippingTestController } from './shipping.test-controller';
import { AdminShippingController } from './admin-shipping.controller';
import { AdminShippingService } from './admin-shipping.service';
import { ShippingMethod, Shipment, Order, ReturnShipment, Payment, ShipmentTrackingHistory } from '../../database/entities';
import { EmailModule } from '../email/email.module';
import { PaymentsModule } from '../payments/payments.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([ShippingMethod, Shipment, Order, ReturnShipment, Payment, ShipmentTrackingHistory]),
    forwardRef(() => EmailModule),
    forwardRef(() => PaymentsModule),
  ],
  controllers: [ShippingController, ShippingWebhookController, ShippingTestController, AdminShippingController],
  providers: [ShippingService, ShippingRocketService, ShippingRocketTestService, AdminShippingService],
  exports: [ShippingService, ShippingRocketService, ShippingRocketTestService, AdminShippingService],
})
export class ShippingModule {}
