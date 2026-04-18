import { Controller, Post, Body, Req, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { ShippingService } from './shipping.service';
import { ShippingRocketService } from './shipping-rocket.service';
import { WebhookPayloadDto } from './dto/webhook.dto';
import { EmailService } from '../email/email.service';
import { PaymentsService } from '../payments/payments.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, Shipment, ShipmentStatus, Payment, PaymentStatus, PaymentMethod, OrderStatus } from '../../database/entities';

@ApiTags('Shipping - Webhooks')
@Controller('shipping/webhooks')
export class ShippingWebhookController {
  private readonly logger = new Logger(ShippingWebhookController.name);

  constructor(
    private readonly shippingService: ShippingService,
    private readonly shippingRocketService: ShippingRocketService,
    private readonly emailService: EmailService,
    private readonly paymentsService: PaymentsService,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
  ) {}

  @Post('status')
  @ApiOperation({ summary: 'Receive ShippingRocket webhook events' })
  async handleShippingWebhook(
    @Body() payload: any,
    @Req() request: Request,
  ) {
    try {
      // Get signature from header
      const signature = request.headers['x-sr-signature'] as string;

      if (!signature) {
        this.logger.warn('Missing webhook signature');
        throw new BadRequestException('Missing signature header');
      }

      // Verify webhook signature
      const payloadString = JSON.stringify(payload);
      const isValid = this.shippingRocketService.verifyWebhookSignature(
        payloadString,
        signature,
      );

      if (!isValid) {
        this.logger.warn('Invalid webhook signature');
        throw new BadRequestException('Invalid signature');
      }

      this.logger.log(`Received webhook event: ${payload.eventType}`);

      // Handle different event types
      switch (payload.eventType) {
        case 'order.created':
          await this.handleOrderCreated(payload);
          break;

        case 'shipment.status_changed':
          await this.handleStatusChanged(payload);
          break;

        case 'pickup.scheduled':
          await this.handlePickupScheduled(payload);
          break;

        case 'pickup.completed':
          await this.handlePickupCompleted(payload);
          break;

        case 'delivery.attempted':
          await this.handleDeliveryAttempted(payload);
          break;

        case 'delivery.failed':
        case 'ndr.created':
          await this.handleNDRRetry(payload);
          break;

        case 'shipment.rto':
          await this.handleRTO(payload);
          break;

        case 'shipment.delivered':
          await this.handleDelivered(payload);
          break;

        case 'cod.collected':
          await this.handleCODPaymentConfirmedByAWB(payload.awb);
          break;

        default:
          this.logger.warn(`Unknown event type: ${payload.eventType}`);
      }

      return { success: true, message: 'Webhook processed' };
    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
    }
  }

  private async handleOrderCreated(payload: any) {
    this.logger.log(`Order created: ${payload.shipmentId}`);
    // Log for monitoring
  }

  private async handleStatusChanged(payload: any) {
    this.logger.log(
      `Status changed for ${payload.trackingNumber}: ${payload.status}`,
    );

    try {
      // Find shipment by tracking number
      const shipment = await this.shipmentRepository.findOne({
        where: { trackingNumber: payload.trackingNumber },
        relations: ['order', 'order.user'],
      });

      if (!shipment || !shipment.order) {
        this.logger.warn(`Shipment not found for tracking ${payload.trackingNumber}`);
        return;
      }

      // Update shipment status
      const statusMap: Record<string, ShipmentStatus> = {
        picked_up: ShipmentStatus.PICKED_UP,
        in_transit: ShipmentStatus.IN_TRANSIT,
        out_for_delivery: ShipmentStatus.OUT_FOR_DELIVERY,
        delivered: ShipmentStatus.DELIVERED,
        failed: ShipmentStatus.FAILED,
        rto: ShipmentStatus.RTO,
      };

      if (statusMap[payload.status]) {
        shipment.status = statusMap[payload.status];
        await this.shipmentRepository.save(shipment);
      }

      // Send email notification
      if (shipment.order.user?.email) {
        const customerName = shipment.order.user.firstName
          ? `${shipment.order.user.firstName} ${shipment.order.user.lastName || ''}`.trim()
          : 'Customer';

        await this.emailService.sendShippingStatusUpdate({
          orderNumber: shipment.order.orderNumber,
          customerEmail: shipment.order.user.email,
          customerName,
          trackingNumber: payload.trackingNumber,
          status: payload.status,
          location: payload.location || '',
          courierName: shipment.courierName || 'Courier',
          estimatedDelivery: payload.estimatedDelivery
            ? new Date(payload.estimatedDelivery)
            : undefined,
        });
      }
    } catch (error) {
      this.logger.error('Error handling status changed:', error);
    }
  }

  private async handlePickupScheduled(payload: any) {
    this.logger.log(`Pickup scheduled for ${payload.trackingNumber}`);
    // Notify customer: "Pickup scheduled"
  }

  private async handlePickupCompleted(payload: any) {
    this.logger.log(`Pickup completed for ${payload.trackingNumber}`);
    // Update status to in_transit
    // Notify customer: "Package picked up"
  }

  private async handleDeliveryAttempted(payload: any) {
    this.logger.warn(
      `Delivery attempt failed for ${payload.trackingNumber}: ${payload.reason}`,
    );

    try {
      const shipment = await this.shipmentRepository.findOne({
        where: { trackingNumber: payload.trackingNumber },
        relations: ['order', 'order.user'],
      });

      if (!shipment || !shipment.order) {
        this.logger.warn(`Shipment not found for tracking ${payload.trackingNumber}`);
        return;
      }

      // Update status to failed
      shipment.status = ShipmentStatus.FAILED;
      await this.shipmentRepository.save(shipment);

      // Send email notification
      if (shipment.order.user?.email) {
        const customerName = shipment.order.user.firstName
          ? `${shipment.order.user.firstName} ${shipment.order.user.lastName || ''}`.trim()
          : 'Customer';

        await this.emailService.sendDeliveryAttempted({
          orderNumber: shipment.order.orderNumber,
          customerEmail: shipment.order.user.email,
          customerName,
          trackingNumber: payload.trackingNumber,
          courierName: shipment.courierName || 'Courier',
          location: payload.location || '',
        });
      }
    } catch (error) {
      this.logger.error('Error handling delivery attempted:', error);
    }
  }

  private async handleRTO(payload: any) {
    this.logger.error(`RTO for ${payload.trackingNumber}`);
    // Critical alert to admin
    // Notify customer: "Package couldn't be delivered"
  }

  private async handleDelivered(payload: any) {
    this.logger.log(`Delivered: ${payload.trackingNumber}`);

    try {
      const shipment = await this.shipmentRepository.findOne({
        where: { trackingNumber: payload.trackingNumber },
        relations: ['order', 'order.user'],
      });

      if (!shipment || !shipment.order) {
        this.logger.warn(`Shipment not found for tracking ${payload.trackingNumber}`);
        return;
      }

      // Update status to delivered
      shipment.status = ShipmentStatus.DELIVERED;
      shipment.deliveredDate = new Date();
      await this.shipmentRepository.save(shipment);

      // Update order status
      shipment.order.shippingStatus = ShipmentStatus.DELIVERED;
      await this.orderRepository.save(shipment.order);

      // Auto-confirm COD payment on delivery
      if (shipment.isCOD) {
        await this.handleCODPaymentConfirmed(shipment.order.id);
      }

      // Send email notification
      if (shipment.order.user?.email) {
        const customerName = shipment.order.user.firstName
          ? `${shipment.order.user.firstName} ${shipment.order.user.lastName || ''}`.trim()
          : 'Customer';

        await this.emailService.sendDelivered({
          orderNumber: shipment.order.orderNumber,
          customerEmail: shipment.order.user.email,
          customerName,
          trackingNumber: payload.trackingNumber,
          courierName: shipment.courierName || 'Courier',
          deliveredDate: new Date(),
        });
      }
    } catch (error) {
      this.logger.error('Error handling delivered:', error);
    }
  }

  private async handleCODPaymentConfirmed(orderId: string): Promise<void> {
    try {
      const payment = await this.paymentRepository.findOne({
        where: { orderId },
      });

      if (payment && payment.method === PaymentMethod.COD && payment.status !== PaymentStatus.COMPLETED) {
        payment.status = PaymentStatus.COMPLETED;
        payment.transactionId = `COD-DELIVERED-${Date.now()}`;
        payment.gatewayResponse = JSON.stringify({
          method: 'COD',
          confirmedAt: new Date().toISOString(),
          confirmedVia: 'delivery_webhook',
        });
        await this.paymentRepository.save(payment);

        this.logger.log(`COD payment confirmed for order ${orderId}`);
      }
    } catch (error) {
      this.logger.error('Error confirming COD payment:', error);
    }
  }

  private async handleNDRRetry(payload: any): Promise<void> {
    this.logger.log(`NDR retry for ${payload.trackingNumber}`);

    try {
      const shipment = await this.shipmentRepository.findOne({
        where: { trackingNumber: payload.trackingNumber },
      });

      if (!shipment || !shipment.shippingRocketId) {
        this.logger.warn(`Shipment not found for tracking ${payload.trackingNumber}`);
        return;
      }

      // Retry NDR delivery automatically
      await this.shippingService.retryNDRDelivery(shipment.id);

      this.logger.log(`NDR retry initiated for shipment ${shipment.id}`);
    } catch (error) {
      this.logger.error('Error retrying NDR delivery:', error);
    }
  }

  private async handleCODPaymentConfirmedByAWB(awbNumber: string): Promise<void> {
    try {
      const shipment = await this.shipmentRepository.findOne({
        where: { awbNumber: awbNumber },
        relations: ['order'],
      });

      if (shipment?.order) {
        await this.handleCODPaymentConfirmed(shipment.order.id);
      }
    } catch (error) {
      this.logger.error('Error confirming COD by AWB:', error);
    }
  }
}
