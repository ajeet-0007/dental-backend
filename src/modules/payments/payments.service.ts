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
  PaymentIntent,
} from "../../database/entities";
import { CreatePaymentDto, CreatePaymentSessionDto } from "./dto/payment.dto";
import { InventoryService } from "../inventory/inventory.service";
import { ShippingService } from "../shipping/shipping.service";
import { ShippingRocketService } from "../shipping/shipping-rocket.service";
import { errorLogger } from "../../common/utils/error-logger";
import { CreateShipmentDto } from "../shipping/dto/create-shipment.dto";
import { generateOrderNumber } from "../../common/utils/slugify";

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
    @InjectRepository(PaymentIntent)
    private paymentIntentRepository: Repository<PaymentIntent>,
    private configService: ConfigService,
    private inventoryService: InventoryService,
    private shippingService: ShippingService,
    private shippingRocketService: ShippingRocketService,
  ) {
    const secretKey = this.configService.get("STRIPE_SECRET_KEY");
    if (secretKey) {
      this.stripe = new Stripe(secretKey);
    }
  }

  async createPaymentSession(
    userId: string,
    createPaymentSessionDto: CreatePaymentSessionDto,
  ): Promise<{ sessionId: string; url: string }> {
    const frontendUrl =
      this.configService.get("FRONTEND_URL") || "http://localhost:5173";

    // Build line items from the cart items passed in
    const lineItems = createPaymentSessionDto.items.map(item => ({
      price_data: {
        currency: "inr",
        product_data: {
          name: item.productName,
          images: item.productImage ? [item.productImage] : undefined,
        },
        unit_amount: Math.round(item.unitPrice * 100),
      },
      quantity: item.quantity,
    }));

    // Save order data to PaymentIntent table (avoids Stripe metadata 500 char limit)
    const paymentIntent = this.paymentIntentRepository.create({
      userId,
      orderData: JSON.stringify(createPaymentSessionDto),
      used: false,
    });
    const savedIntent = await this.paymentIntentRepository.save(paymentIntent);
    console.log(`[PaymentIntent] Created: ${savedIntent.id}`);

    // Store only paymentIntentId and userId in Stripe metadata (well under 500 chars)
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${frontendUrl}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/checkout?payment=cancelled`,
      metadata: {
        paymentIntentId: savedIntent.id,
        userId,
      },
    });

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
    const userId = session.metadata?.userId;
    const paymentIntentId = session.metadata?.paymentIntentId;

    console.log(`Processing checkout.session.completed for session: ${session.id}`);
    console.log(`  - orderId from metadata: ${orderId}`);
    console.log(`  - userId from metadata: ${userId}`);
    console.log(`  - paymentIntentId from metadata: ${paymentIntentId}`);
    console.log(`  - payment_intent: ${session.payment_intent}`);

    // New flow: order data in PaymentIntent table, create order now
    if (paymentIntentId) {
      try {
        // Fetch order data from PaymentIntent table
        const paymentIntent = await this.paymentIntentRepository.findOne({
          where: { id: paymentIntentId, userId },
        });

        if (!paymentIntent) {
          console.error(`PaymentIntent not found: ${paymentIntentId}`);
          return;
        }

        if (paymentIntent.used) {
          console.log(`PaymentIntent already used: ${paymentIntentId}`);
          return;
        }

        const orderData = JSON.parse(paymentIntent.orderData);
        console.log(`  - Creating order from PaymentIntent`);

        // Create order items from the items in PaymentIntent
        const orderItems = orderData.items.map((item: any) => ({
          productId: item.productId,
          productVariantId: item.productVariantId,
          productName: item.productName,
          productImage: item.productImage || '',
          sku: item.sku,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          sellingPrice: item.unitPrice,
          taxAmount: Math.round(item.unitPrice * item.quantity * 0.18 * 100) / 100,
          discountAmount: 0,
          totalAmount: item.unitPrice * item.quantity + Math.round(item.unitPrice * item.quantity * 0.18 * 100) / 100,
        }));

        // Parse shipping address if it's a string
        let shippingAddress = orderData.shippingAddress;
        if (orderData.addressId) {
          const address = await this.orderRepository.manager.findOne('Address', {
            where: { id: +orderData.addressId, userId },
          });
          if (address) {
            shippingAddress = JSON.stringify({
              firstName: (address as any).name,
              lastName: '',
              name: (address as any).name,
              addressLine1: (address as any).addressLine1,
              addressLine2: (address as any).addressLine2,
              city: (address as any).city,
              state: (address as any).state,
              pincode: (address as any).pincode,
              country: 'India',
              phone: (address as any).phone,
            });
          }
        }

        // Create the order
        const order = this.orderRepository.create({
          orderNumber: generateOrderNumber(),
          userId,
          status: OrderStatus.CONFIRMED,
          subtotal: orderData.subtotal,
          taxAmount: orderData.taxAmount,
          shippingAmount: orderData.shippingAmount,
          discountAmount: 0,
          totalAmount: orderData.totalAmount,
          shippingAddress,
          customerNote: orderData.customerNote,
          couponCode: orderData.couponCode,
          selectedCourier: orderData.selectedCourier,
          selectedService: orderData.selectedService,
          shippingRate: orderData.shippingRate,
        });

        const savedOrder = await this.orderRepository.save(order);
        console.log(`  - Order created: ${savedOrder.id}`);

        // Save order items
        const orderItemsEntities = orderItems.map((item: any) => ({
          ...item,
          orderId: savedOrder.id,
        }));
        await this.orderItemRepository.save(orderItemsEntities);
        console.log(`  - Order items saved`);

        // Create payment record
        const payment = this.paymentRepository.create({
          orderId: savedOrder.id,
          amount: orderData.totalAmount,
          status: PaymentStatus.COMPLETED,
          method: PaymentMethod.CARD,
          transactionId: (session.payment_intent as string) || '',
          gatewayPaymentId: session.id,
          gatewayResponse: JSON.stringify(session),
        });
        await this.paymentRepository.save(payment);
        console.log(`  - Payment record created with status COMPLETED`);

        // Mark PaymentIntent as used
        paymentIntent.used = true;
        await this.paymentIntentRepository.save(paymentIntent);

        // Reserve inventory
        for (const item of orderItems) {
          await this.inventoryService.reserveStock(item.productId, item.quantity);
        }
        console.log(`  - Inventory reserved`);

        // Create shipment
        try {
          const fullOrder = await this.orderRepository.findOne({
            where: { id: savedOrder.id },
            relations: ['items', 'items.product'],
          });
          if (fullOrder) {
            await this.createShipmentAfterPayment(fullOrder);
          }
        } catch (error) {
          console.error(`Failed to create shipment for order ${savedOrder.id}:`, error);
        }

        console.log(`Order ${savedOrder.id} created and confirmed successfully via webhook`);
        return;
      } catch (error) {
        console.error(`Error creating order from PaymentIntent:`, error);
        if (error instanceof Error) {
          console.error(`Message: ${error.message}`);
          console.error(`Stack: ${error.stack}`);
        }
        throw error;
      }
    }

    // Legacy flow: order already exists (for backward compatibility)
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
    const warehousePincode = this.configService.get('WAREHOUSE_PINCODE') || '243001';
    let totalWeight = 0;
    let totalLength = 10;
    let totalBreadth = 10;
    let totalHeight = 10;

    if (fullOrder.items && fullOrder.items.length > 0) {
      // Get weight from products if available, otherwise estimate
      for (const item of fullOrder.items) {
        const itemWeight = (item as any)?.product?.weight || 500;
        totalWeight += itemWeight * item.quantity;
        const itemLength = (item as any)?.product?.length || 10;
        const itemBreadth = (item as any)?.product?.breadth || 10;
        const itemHeight = (item as any)?.product?.height || 10;
        totalLength = Math.max(totalLength, itemLength);
        totalBreadth = Math.max(totalBreadth, itemBreadth);
        totalHeight = Math.max(totalHeight, itemHeight);
      }
      totalWeight = totalWeight / 1000; // Convert g to kg
    } else {
      totalWeight = 0.5; // Default 500g
    }

    totalWeight = Math.max(totalWeight, 0.5); // Minimum 500g

    // Calculate shipping rates and pick cheapest
    let ratesResponse: { couriers: any[] } | null = null;
    try {
      ratesResponse = await this.shippingRocketService.calculateRates({
        pickupPincode: warehousePincode,
        deliveryPincode,
        weight: totalWeight,
        length: totalLength,
        breadth: totalBreadth,
        height: totalHeight,
      });
    } catch (error) {
      console.log(`Failed to calculate rates for order ${order.id}:`, error.message);
    }

    let selectedCourier = 'Standard';
    let selectedService = 'Standard';
    let shippingRate = 50;

    if (ratesResponse && ratesResponse.couriers && ratesResponse.couriers.length > 0) {
      const couriers = ratesResponse.couriers;
      couriers.sort((a: any, b: any) => a.rate - b.rate);
      const cheapest = couriers[0];
      selectedCourier = cheapest.name;
      selectedService = cheapest.serviceType;
      shippingRate = cheapest.rate;
      console.log(`Selected cheapest courier for order ${order.id}: ${selectedCourier} (${selectedService}) - ₹${shippingRate}`);
    } else {
      console.log(`Using default shipping rate for order ${order.id}: ₹${shippingRate}`);
    }

    // Create shipment DTO
    const createShipmentDto: CreateShipmentDto = {
      orderId: order.id,
      selectedCourier,
      selectedService,
      deliveryPincode,
      weight: totalWeight,
      length: totalLength,
      breadth: totalBreadth,
      height: totalHeight,
      isCOD: false, // Card payment is not COD
    };

    console.log(`Shipment dimensions for order ${order.id}: weight=${totalWeight}kg, ${totalLength}x${totalBreadth}x${totalHeight}cm`);

    // Create shipment
    try {
      const shipment = await this.shippingService.createShippingRocketShipment(
        createShipmentDto,
      );

      console.log(`Shipment created for order ${order.id}:`, shipment.id);

      // Update order with shipment info
      order.selectedCourier = selectedCourier;
      order.selectedService = selectedService;
      order.shippingRate = shippingRate;
      order.shippingAmount = shippingRate;
      order.shipmentId = shipment.id;
      order.trackingNumber = shipment.trackingNumber;
      order.shippingStatus = shipment.status;
      order.inventoryDeducted = true;
      await this.orderRepository.save(order);

      console.log(`Order ${order.id} updated with shipment info`);
    } catch (error) {
      console.log(`Failed to create shipment for order ${order.id}:`, error.message);
      // Update order with rate but create shipment record failed - will be created manually
      order.selectedCourier = selectedCourier;
      order.selectedService = selectedService;
      order.shippingRate = shippingRate;
      order.shippingAmount = shippingRate;
      await this.orderRepository.save(order);
      console.log(`Order ${order.id} updated with rate info - shipment can be created manually`);
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
      return { success: true, orderId: existingPayment.order.id };
    }

    // No existing payment found, verify with Stripe
    if (!this.stripe) {
      console.error("Stripe not initialized");
      return { success: false, error: "Stripe not configured" };
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId);
      console.log("Session retrieved:", session.id, "Status:", session.payment_status);

      if (session.payment_status === "paid") {
        console.log("Payment is paid, creating order from PaymentIntent");

        const userId = session.metadata?.userId;
        const paymentIntentId = session.metadata?.paymentIntentId;

        if (paymentIntentId) {
          // Fetch order data from PaymentIntent table
          const paymentIntent = await this.paymentIntentRepository.findOne({
            where: { id: paymentIntentId, userId },
          });

          if (!paymentIntent) {
            return { success: false, error: "PaymentIntent not found" };
          }

          if (paymentIntent.used) {
            return { success: true };
          }

          const orderData = JSON.parse(paymentIntent.orderData);

          // Create order now (same logic as webhook)
          try {
            const orderItems = orderData.items.map((item: any) => ({
              productId: item.productId,
              productVariantId: item.productVariantId,
              productName: item.productName,
              productImage: item.productImage || '',
              sku: item.sku,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              sellingPrice: item.unitPrice,
              taxAmount: Math.round(item.unitPrice * item.quantity * 0.18 * 100) / 100,
              discountAmount: 0,
              totalAmount: item.unitPrice * item.quantity + Math.round(item.unitPrice * item.quantity * 0.18 * 100) / 100,
            }));

            // Parse shipping address if it's a string
            let shippingAddress = orderData.shippingAddress;
            if (orderData.addressId) {
              const address = await this.orderRepository.manager.findOne('Address', {
                where: { id: +orderData.addressId, userId },
              });
              if (address) {
                shippingAddress = JSON.stringify({
                  firstName: (address as any).name,
                  lastName: '',
                  name: (address as any).name,
                  addressLine1: (address as any).addressLine1,
                  addressLine2: (address as any).addressLine2,
                  city: (address as any).city,
                  state: (address as any).state,
                  pincode: (address as any).pincode,
                  country: 'India',
                  phone: (address as any).phone,
                });
              }
            }

            // Create the order
            const order = this.orderRepository.create({
              orderNumber: generateOrderNumber(),
              userId,
              status: OrderStatus.CONFIRMED,
              subtotal: orderData.subtotal,
              taxAmount: orderData.taxAmount,
              shippingAmount: orderData.shippingAmount,
              discountAmount: 0,
              totalAmount: orderData.totalAmount,
              shippingAddress,
              customerNote: orderData.customerNote,
              couponCode: orderData.couponCode,
              selectedCourier: orderData.selectedCourier,
              selectedService: orderData.selectedService,
              shippingRate: orderData.shippingRate,
            });

            const savedOrder = await this.orderRepository.save(order);
            console.log(`  - Order created: ${savedOrder.id}`);

            // Save order items
            const orderItemsEntities = orderItems.map((item: any) => ({
              ...item,
              orderId: savedOrder.id,
            }));
            await this.orderItemRepository.save(orderItemsEntities);

            // Create payment record
            const payment = this.paymentRepository.create({
              orderId: savedOrder.id,
              amount: orderData.totalAmount,
              status: PaymentStatus.COMPLETED,
              method: PaymentMethod.CARD,
              transactionId: (session.payment_intent as string) || '',
              gatewayPaymentId: session.id,
              gatewayResponse: JSON.stringify(session),
            });
            await this.paymentRepository.save(payment);

            // Mark PaymentIntent as used
            paymentIntent.used = true;
            await this.paymentIntentRepository.save(paymentIntent);

            // Reserve inventory
            for (const item of orderItems) {
              await this.inventoryService.reserveStock(item.productId, item.quantity);
            }

            // Create shipment
            try {
              const fullOrder = await this.orderRepository.findOne({
                where: { id: savedOrder.id },
                relations: ['items', 'items.product'],
              });
              if (fullOrder) {
                await this.createShipmentAfterPayment(fullOrder);
              }
            } catch (error) {
              console.error(`Failed to create shipment for order ${savedOrder.id}:`, error);
            }

            console.log(`Order ${savedOrder.id} created and confirmed via session verification`);
            return { success: true, orderId: savedOrder.id };
          } catch (error) {
            console.error("Error creating order from PaymentIntent:", error);
            return { success: false, error: "Failed to create order from PaymentIntent" };
          }
        }

        return { success: true };
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
