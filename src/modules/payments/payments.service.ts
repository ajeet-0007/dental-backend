import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import Stripe from "stripe";
import {
  Payment,
  Order,
  PaymentStatus,
  PaymentMethod,
  OrderStatus,
  OrderItem,
} from "../../database/entities";
import { CreatePaymentDto } from "./dto/payment.dto";
import { InventoryService } from "../inventory/inventory.service";
import { ShippingService } from "../shipping/shipping.service";
import { errorLogger } from "../../common/utils/error-logger";
import { CreateShipmentDto } from "../shipping/dto/create-shipment.dto";

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    private configService: ConfigService,
    private inventoryService: InventoryService,
    private shippingService: ShippingService,
  ) {
    const secretKey = this.configService.get("STRIPE_SECRET_KEY");
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  async createPaymentSession(
    userId: string,
    createPaymentDto: CreatePaymentDto,
  ): Promise<{ sessionId: string; url: string }> {
    const order = await this.orderRepository.findOne({
      where: { id: createPaymentDto.orderId, userId },
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException("Cannot payment for cancelled order");
    }

    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:5173";

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "inr",
            product_data: {
              name: `Order #${order.orderNumber}`,
              description: "Dental products purchase",
            },
            unit_amount: Math.round(Number(order.totalAmount) * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${frontendUrl}/orders/${order.id}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/orders/${order.id}?payment=cancelled`,
      metadata: {
        orderId: order.id,
        userId,
      },
    });

    const payment = this.paymentRepository.create({
      orderId: order.id,
      amount: order.totalAmount,
      status: PaymentStatus.PENDING,
      method: PaymentMethod.CARD,
      gatewayPaymentId: session.id,
    });
    await this.paymentRepository.save(payment);

    let checkoutUrl = session.url || "";
    console.log("[DEBUG] Original Stripe URL:", checkoutUrl);

    if (checkoutUrl.includes("{CHECKOUT_SESSION_ID}")) {
      checkoutUrl = checkoutUrl.replace("{CHECKOUT_SESSION_ID}", session.id);
    } else if (checkoutUrl.includes("#")) {
      checkoutUrl = checkoutUrl.replace("#", `?session_id=${session.id}#`);
    } else {
      const separator = checkoutUrl.includes("?") ? "&" : "?";
      checkoutUrl = `${checkoutUrl}${separator}session_id=${session.id}`;
    }

    console.log("[DEBUG] Final redirect URL:", checkoutUrl);

    return {
      sessionId: session.id,
      url: checkoutUrl,
    };
  }

  async handleWebhook(payload: Buffer, signature: string): Promise<void> {
    const webhookSecret = this.configService.get("STRIPE_WEBHOOK_SECRET");

    if (!webhookSecret) {
      console.log("Stripe webhook secret not configured - skipping webhook");
      return;
    }

    let event: Stripe.Event;

    console.log(`handleWebhook - payload length: ${payload?.length}`);
    console.log(`handleWebhook - signature: ${signature?.substring(0, 30)}...`);

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
      console.log(`handleWebhook - Event type: ${event.type}`);
    } catch (err) {
      console.error("=== WEBHOOK SIGNATURE VERIFICATION FAILED ===");
      console.error("Error:", err);
      console.error("Payload length:", payload?.length);
      console.error("Payload string:", payload?.toString().substring(0, 100));
      console.error("Signature header:", signature);
      console.error("Webhook secret:", webhookSecret);

      errorLogger.log(err, "Webhook Signature Verification Failed");

      throw new BadRequestException("Webhook signature verification failed");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      console.log(`==> Received checkout.session.completed event <==`);
      try {
        await this.processSuccessfulPayment(session);
      } catch (error) {
        console.error(`Error in processSuccessfulPayment:`, error);
        if (error instanceof Error) {
          console.error(`Message: ${error.message}`);
          console.error(`Stack: ${error.stack}`);
          errorLogger.log(error, "processSuccessfulPayment");
        }
        throw error;
      }
    }
  }

  private async processSuccessfulPayment(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const orderId = session.metadata?.orderId;

    console.log(`Processing checkout.session.completed for session: ${session.id}`);
    console.log(`  - orderId from metadata: ${orderId}`);
    console.log(`  - payment_intent: ${session.payment_intent}`);

    if (!orderId) {
      console.log("No orderId in session metadata - returning early");
      return;
    }

    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    console.log(`  - Payment record found: ${payment ? 'yes' : 'no'}`);

    if (!payment) {
      console.log(`No payment record for order ${orderId} - returning early`);
      return;
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.transactionId = (session.payment_intent as string) || "";
    payment.gatewayPaymentId = session.id;
    payment.gatewayResponse = JSON.stringify(session);
    await this.paymentRepository.save(payment);
    console.log(`  - Payment status updated to COMPLETED`);

    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ["items"],
    });

    console.log(`  - Order found: ${order ? 'yes' : 'no'}`);
    if (order) {
      console.log(`  - Order status: ${order.status}`);
    }

    if (order && order.status === OrderStatus.PENDING_PAYMENT) {
      order.status = OrderStatus.CONFIRMED;
      await this.orderRepository.save(order);
      console.log(`  - Order status updated to CONFIRMED`);

      for (const item of order.items) {
        await this.inventoryService.reserveStock(
          item.productId,
          item.quantity,
        );
      }
      console.log(`Order ${orderId} confirmed successfully`);

      // Auto-create shipment after payment success
      try {
        console.log(`Calling createShipmentAfterPayment for order ${order.id}...`);
        await this.createShipmentAfterPayment(order);
        console.log(`Shipment creation completed for order ${order.id}`);
      } catch (error) {
        console.error(`Failed to create shipment for order ${orderId}:`, error);
        if (error instanceof Error) {
          console.error(`Error message: ${error.message}`);
          console.error(`Error stack: ${error.stack}`);
          errorLogger.log(error, "createShipmentAfterPayment");
        }
        // Don't throw - order is already confirmed, shipment can be created manually
      }
    } else {
      console.log(`Order ${orderId} not pending payment or not found - skipping confirmation`);
    }
  }

  private async createShipmentAfterPayment(order: Order): Promise<void> {
    console.log(`Checking shipment for order ${order.id}:`);
    console.log(`  - selectedCourier: ${order.selectedCourier}`);
    console.log(`  - selectedService: ${order.selectedService}`);
    console.log(`  - shippingAddress: ${order.shippingAddress?.substring(0, 100)}...`);

    // Only create shipment if order has selectedCourier and selectedService
    if (!order.selectedCourier || !order.selectedService) {
      console.log(`Order ${order.id} missing courier/service - skipping auto-shipment`);
      return;
    }

    // Check if shipment already exists for this order
    const shipmentExists = await this.shippingService.shipmentExistsForOrder(order.id);
    console.log(`  - shipmentExists: ${shipmentExists}`);
    if (shipmentExists) {
      console.log(`Shipment already exists for order ${order.id} - skipping duplicate creation`);
      return;
    }

    // Parse shipping address to extract pincode
    let deliveryPincode = '';
    if (order.shippingAddress) {
      try {
        // Try JSON first (new format)
        const addressObj = JSON.parse(order.shippingAddress);
        deliveryPincode = addressObj.pincode || addressObj.zipCode || '';
      } catch {
        // Fallback: extract 6-digit PIN from plain text (Indian PIN codes)
        const match = order.shippingAddress.match(/\b(\d{6})\b/);
        if (match) {
          deliveryPincode = match[1];
          console.log(`Extracted pincode from plain text: ${deliveryPincode}`);
        } else {
          console.log(`Failed to parse shipping address for order ${order.id}`);
        }
      }
    }

    if (!deliveryPincode) {
      console.log(`Order ${order.id} missing delivery pincode - cannot create shipment`);
      return;
    }

    // Reload order with user relation to get customer details
    const fullOrder = await this.orderRepository.findOne({
      where: { id: order.id },
      relations: ['user', 'items', 'items.product'],
    });

    if (!fullOrder || !fullOrder.user) {
      console.log(`Order ${order.id} missing customer details - cannot create shipment`);
      return;
    }

    // Calculate dimensions and weight from order items
    // Default: dental products are typically lightweight and compact
    let totalWeight = 0; // kg
    let totalLength = 5; // cm - standard envelope base
    let totalBreadth = 5; // cm
    let totalHeight = 2; // cm - stack height

    if (fullOrder.items && fullOrder.items.length > 0) {
      // For dental products, estimate based on quantity
      // Assume average product: 100g, 5x5cm footprint, 1cm height per item
      totalWeight = (fullOrder.items.reduce((sum, item) => sum + item.quantity, 0) * 0.1); // 100g per item
      totalHeight = 2 + (fullOrder.items.reduce((sum, item) => sum + item.quantity, 0) * 0.5); // 0.5cm per item

      // Ensure reasonable minimums and maximums
      totalWeight = Math.max(0.1, Math.min(30, totalWeight)); // 100g to 30kg
      totalHeight = Math.max(2, Math.min(30, totalHeight)); // 2cm to 30cm
    } else {
      // Fallback: standard small package (100g, 5x5x2cm)
      totalWeight = 0.1;
    }

    // Create shipment DTO
    const createShipmentDto: CreateShipmentDto = {
      orderId: order.id,
      selectedCourier: order.selectedCourier,
      selectedService: order.selectedService,
      deliveryPincode,
      weight: totalWeight,
      length: totalLength,
      breadth: totalBreadth,
      height: totalHeight,
      isCOD: false, // Card payment is not COD
    };

    console.log(`Shipment dimensions for order ${order.id}: weight=${totalWeight}kg, ${totalLength}x${totalBreadth}x${totalHeight}cm`);


    // Create shipment
    const shipment = await this.shippingService.createShippingRocketShipment(
      createShipmentDto,
    );

    console.log(`Shipment created for order ${order.id}:`, shipment.id);

    // Update order with shipment info
    order.shipmentId = shipment.id;
    order.trackingNumber = shipment.trackingNumber;
    order.shippingStatus = shipment.status;
    order.inventoryDeducted = true; // Mark inventory as deducted
    await this.orderRepository.save(order);

    console.log(`Order ${order.id} updated with shipment info`);
  }

  async verifyAndConfirmPayment(
    sessionId: string,
  ): Promise<{ success: boolean; orderId?: string; error?: string }> {
    console.log("Verifying session:", sessionId);

    // First, check if we already have a payment with this session ID
    const existingPayment = await this.paymentRepository.findOne({
      where: { gatewayPaymentId: sessionId },
      relations: ["order"],
    });

    if (existingPayment && existingPayment.order) {
      console.log("Found existing payment for session");

      if (existingPayment.order.status === OrderStatus.PENDING_PAYMENT) {
        // Payment was successful but order not confirmed - confirm it now
        if (existingPayment.status !== PaymentStatus.COMPLETED) {
          existingPayment.status = PaymentStatus.COMPLETED;
          existingPayment.transactionId = existingPayment.gatewayPaymentId;
          await this.paymentRepository.save(existingPayment);
        }

        existingPayment.order.status = OrderStatus.CONFIRMED;
        await this.orderRepository.save(existingPayment.order);

        // Reserve inventory
        const orderItems = await this.orderItemRepository.find({
          where: { orderId: existingPayment.order.id },
        });

        for (const item of orderItems) {
          await this.inventoryService.reserveStock(
            item.productId,
            item.quantity,
          );
        }

        console.log("Order confirmed via existing payment");
        return { success: true, orderId: existingPayment.order.id };
      }

      // Order already processed
      return { success: true, orderId: existingPayment.order.id };
    }

    // No existing payment found, try to verify with Stripe
    if (!this.stripe) {
      console.error("Stripe not initialized");
      return { success: false, error: "Stripe not configured" };
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      console.log(
        "Session retrieved:",
        session.id,
        "Status:",
        session.payment_status,
      );

      if (session.payment_status === "paid") {
        console.log("Payment is paid, already processed by webhook");
        // Don't process here - the webhook will handle it
        // This prevents duplicate shipment creation from race conditions
        return { success: true, orderId: session.metadata?.orderId };
      }

      console.log("Payment not completed, status:", session.payment_status);
      return {
        success: false,
        error: `Payment status: ${session.payment_status}`,
      };
    } catch (error: any) {
      console.error("Error verifying payment:", error.message);
      return { success: false, error: error.message };
    }
  }

  async verifyPayment(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
      relations: ["order"],
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async handlePaymentFailure(
    orderId: string,
    reason: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = reason;

    return this.paymentRepository.save(payment);
  }

  async confirmCODPayment(
    orderId: string,
    transactionId?: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    if (payment.method !== PaymentMethod.COD) {
      throw new BadRequestException("Order is not a COD order");
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return payment;
    }

    payment.status = PaymentStatus.COMPLETED;
    payment.transactionId = transactionId || `COD-${Date.now()}`;
    payment.gatewayResponse = JSON.stringify({
      method: "COD",
      confirmedAt: new Date().toISOString(),
    });

    return this.paymentRepository.save(payment);
  }

  async markCODPaymentFailed(
    orderId: string,
    reason: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    payment.status = PaymentStatus.FAILED;
    payment.failureReason = reason;

    return this.paymentRepository.save(payment);
  }

  async getPaymentByOrder(orderId: string): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found");
    }

    return payment;
  }

  async getPaymentsForAdmin(
    page = 1,
    limit = 10,
  ): Promise<{ payments: Payment[]; total: number }> {
    const [payments, total] = await this.paymentRepository.findAndCount({
      relations: ["order", "order.user"],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: "DESC" },
    });

    return { payments, total };
  }
}
