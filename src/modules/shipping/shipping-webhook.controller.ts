import { Controller, Post, Body, Req, Logger, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Request } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Order, Shipment, ShipmentStatus, Payment, PaymentStatus, PaymentMethod, OrderStatus } from '../../database/entities';
import { ORDER_CANCELLED_EVENT } from '../order-notifications/order-notifications.types';
import { buildOrderEmailPayload } from '../order-notifications/order-notifications.mapper';

@ApiTags('Shipping - Webhooks')
@Controller('shipping')
export class ShippingWebhookController {
  private readonly logger = new Logger(ShippingWebhookController.name);

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private eventEmitter: EventEmitter2,
  ) {}

  @Post('webhook')
  @ApiOperation({ summary: 'Receive ShippingRocket webhook events (root)' })
  async handleWebhookRoot(
    @Body() payload: any,
    @Req() request: Request,
  ) {
    // Skip signature validation for testing
    const signature = request.headers['x-sr-signature'] as string;
    if (!signature) {
      this.logger.warn('Missing webhook signature - allowing for testing');
    }

    return this.processWebhook(payload);
  }

  @Post('webhooks/status')
  @ApiOperation({ summary: 'Receive ShippingRocket webhook events (legacy)' })
  async handleWebhookLegacy(
    @Body() payload: any,
    @Req() request: Request,
  ) {
    // Skip signature validation for testing
    const signature = request.headers['x-sr-signature'] as string;
    if (!signature) {
      this.logger.warn('Missing webhook signature - allowing for testing');
    }

    return this.processWebhook(payload);
  }

  private async processWebhook(payload: any): Promise<any> {
    try {
      this.logger.log(`Received webhook event: ${payload.eventType}`);

      // Handle status-based webhook (ShipRocket sends current_status without eventType)
      if ((payload.current_status || payload.shipment_status)) {
        await this.handleByCurrentStatus(payload);
      }

      return { success: true };

    } catch (error) {
      this.logger.error('Error processing webhook:', error);
      throw error;
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


  private async handleByCurrentStatus(payload: any): Promise<void> {
    const status = (payload.current_status || payload.shipment_status || '').toUpperCase();
    this.logger.log(`Processing status-based webhook: ${status}`);
    // Try by ShipRocket order ID first
    if (payload.sr_order_id) {
      const shipment = await this.shipmentRepository.findOne({
        where: { srOrderId: payload.sr_order_id?.toString() },
        relations: ['order', 'order.user'],
      });

      if (shipment) {
        await this.updateShipmentByStatus(shipment, status, payload);
        return;
      }
    }

    // Fallback: try by AWB
    if (payload.awb) {
      const shipmentByAwb = await this.shipmentRepository.findOne({
        where: { awbNumber: payload.awb },
        relations: ['order', 'order.user'],
      });
      if (shipmentByAwb) {
        await this.updateShipmentByStatus(shipmentByAwb, status, payload);
        return;
      }
    }

    // Fallback: try by tracking number
    if (payload.tracking_number) {
      const shipmentByTracking = await this.shipmentRepository.findOne({
        where: { trackingNumber: payload.tracking_number },
        relations: ['order', 'order.user'],
      });
      if (shipmentByTracking) {
        await this.updateShipmentByStatus(shipmentByTracking, status, payload);
        return;
      }
    }

    this.logger.warn(`Shipment not found for status update: ${status}`);
  }

  private async updateShipmentByStatus(shipment: Shipment, status: string, payload: any): Promise<void> {
    const statusMap: Record<string, ShipmentStatus> = {
      'CANCELLED': ShipmentStatus.CANCELLED,
      'CANCELED': ShipmentStatus.CANCELLED,
      'DELIVERED': ShipmentStatus.DELIVERED,
      'IN TRANSIT': ShipmentStatus.IN_TRANSIT,
      'TRANSIT': ShipmentStatus.IN_TRANSIT,
      'OUT FOR DELIVERY': ShipmentStatus.OUT_FOR_DELIVERY,
      'PICKED UP': ShipmentStatus.PICKED_UP,
      'PICKED': ShipmentStatus.PICKED_UP,
      'PENDING': ShipmentStatus.PROCESSING,
      'PROCESSING': ShipmentStatus.PROCESSING,
      'CONFIRMED': ShipmentStatus.PROCESSING,
      'FAILED': ShipmentStatus.FAILED,
      'UNDELIVERED': ShipmentStatus.FAILED,
      'NDR': ShipmentStatus.FAILED,
      'RTO': ShipmentStatus.RTO,
      'RTO IN TRANSIT': ShipmentStatus.RTO,
    };

    const newStatus = statusMap[status];
    if (!newStatus) {
      this.logger.warn(`Unknown status: ${status}`);
      return;
    }

    shipment.status = newStatus;
    shipment.lastWebhookEvent = status;
    shipment.lastWebhookAt = new Date();

    // Store AWB number from webhook payload
    if (payload.awb) {
      shipment.awbNumber = payload.awb;
    }

    // Store courier name from webhook payload
    if (payload.courier_name) {
      shipment.courierName = payload.courier_name;
    }

    // Store tracking number if available
    if (payload.tracking_number) {
      shipment.trackingNumber = payload.tracking_number;
    }

    await this.shipmentRepository.save(shipment);

    // Update order status accordingly
    if (shipment.order) {
      const previousOrderStatus = shipment.order.status;
      const orderStatusMap: Record<string, OrderStatus> = {
        [ShipmentStatus.CANCELLED.toString()]: OrderStatus.CANCELLED,
        [ShipmentStatus.DELIVERED.toString()]: OrderStatus.DELIVERED,
        [ShipmentStatus.IN_TRANSIT.toString()]: OrderStatus.SHIPPED,
        [ShipmentStatus.OUT_FOR_DELIVERY.toString()]: OrderStatus.SHIPPED,
        [ShipmentStatus.PICKED_UP.toString()]: OrderStatus.SHIPPED,
        [ShipmentStatus.FAILED.toString()]: OrderStatus.SHIPPED,
        [ShipmentStatus.RTO.toString()]: OrderStatus.SHIPPED,
        [ShipmentStatus.PROCESSING.toString()]: OrderStatus.PROCESSING,
      };
      shipment.order.shippingStatus = newStatus;
      
      // Track RTO and delivery failure separately
      if (newStatus === ShipmentStatus.RTO) {
        shipment.order.isRTO = true;
      }
      if (newStatus === ShipmentStatus.FAILED) {
        shipment.order.deliveryFailed = true;
        shipment.order.deliveryFailedReason = 'Delivery attempt unsuccessful';
      }
      
      if (orderStatusMap[newStatus.toString()]) {
        shipment.order.status = orderStatusMap[newStatus.toString()];
      }
      await this.orderRepository.save(shipment.order);

      // A shipment cancellation cancels the order too, and the order can reach
      // this webhook after an in-app cancellation has already notified the
      // customer (cancelling on ShipRocket sends the webhook straight back).
      // Only notify on a genuine transition so that does not double-send.
      if (
        shipment.order.status === OrderStatus.CANCELLED &&
        previousOrderStatus !== OrderStatus.CANCELLED
      ) {
        void this.emitOrderCancelled(shipment.order);
      }
    }

    this.logger.log(`Shipment ${shipment.id} updated to status: ${status}`);
  }

  /**
   * Emits the order-cancelled event for a cancellation that originated on the
   * courier side. The shipment was loaded with only `order` and `order.user`,
   * so the order is re-read with its line items before the event is built.
   * Fire-and-forget, and errors are swallowed so a mail problem can never make a
   * ShipRocket webhook fail.
   */
  private async emitOrderCancelled(order: Order): Promise<void> {
    try {
      const fullOrder = await this.orderRepository.findOne({
        where: { id: order.id },
        relations: ['items', 'user', 'payments'],
      });

      if (!fullOrder) {
        return;
      }

      this.eventEmitter.emit(ORDER_CANCELLED_EVENT, {
        ...buildOrderEmailPayload(fullOrder),
        cancelledBy: 'admin',
        reason: 'Cancelled by the courier',
      });
    } catch (error) {
      this.logger.error(
        `Failed to emit order-cancelled event for #${order?.orderNumber}:`,
        error,
      );
    }
  }
}
