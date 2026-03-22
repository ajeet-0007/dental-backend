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

    try {
      event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      throw new BadRequestException("Webhook signature verification failed");
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      await this.processSuccessfulPayment(session);
    }
  }

  private async processSuccessfulPayment(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const orderId = session.metadata?.orderId;

    if (!orderId) {
      console.log("No orderId in session metadata");
      return;
    }

    const payment = await this.paymentRepository.findOne({
      where: { orderId },
    });

    if (payment) {
      payment.status = PaymentStatus.COMPLETED;
      payment.transactionId = session.payment_intent as string;
      payment.gatewayPaymentId = session.id;
      payment.gatewayResponse = JSON.stringify(session);
      await this.paymentRepository.save(payment);

      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ["items"],
      });

      if (order && order.status === OrderStatus.PENDING_PAYMENT) {
        order.status = OrderStatus.CONFIRMED;
        await this.orderRepository.save(order);

        for (const item of order.items) {
          await this.inventoryService.reserveStock(
            item.productId,
            item.quantity,
          );
        }
        console.log(`Order ${orderId} confirmed successfully`);
      }
    }
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
        console.log("Payment is paid, processing...");
        await this.processSuccessfulPayment(session);
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
