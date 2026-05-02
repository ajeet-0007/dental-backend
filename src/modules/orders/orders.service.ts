import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource } from "typeorm";
import {
  Order,
  OrderItem,
  Cart,
  Product,
  ProductVariant,
  Inventory,
  Address,
  OrderStatus,
  Payment,
  PaymentStatus,
  PaymentMethod,
  Shipment,
  ShipmentStatus,
  ShipmentTrackingHistory,
} from "../../database/entities";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import { generateOrderNumber } from "../../common/utils/slugify";
import { InventoryService } from "../inventory/inventory.service";
import { ShippingRocketService } from "../shipping/shipping-rocket.service";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);
  private warehousePincode: string;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private productVariantRepository: Repository<ProductVariant>,
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Address)
    private addressRepository: Repository<Address>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Shipment)
    private shipmentRepository: Repository<Shipment>,
    @InjectRepository(ShipmentTrackingHistory)
    private trackingHistoryRepository: Repository<ShipmentTrackingHistory>,
    private inventoryService: InventoryService,
    private shippingRocketService: ShippingRocketService,
    private configService: ConfigService,
    private dataSource: DataSource,
  ) {
    this.warehousePincode = this.configService.get<string>('WAREHOUSE_PINCODE') || '243001';
  }

  async create(userId: string, createOrderDto: CreateOrderDto): Promise<Order> {
    const cartItems = await this.cartRepository.find({
      where: { userId },
      relations: ["product", "productVariant"],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException("Cart is empty");
    }

    let shippingAddress = createOrderDto.shippingAddress;

    if (createOrderDto.addressId) {
      const address = await this.addressRepository.findOne({
        where: { id: +createOrderDto.addressId, userId },
      });

      if (!address) {
        throw new NotFoundException("Address not found");
      }

      // Store as JSON for consistent parsing
      shippingAddress = JSON.stringify({
        firstName: address.name,
        lastName: '',
        name: address.name,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: 'India',
        phone: address.phone,
      });
    }

    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const cartItem of cartItems) {
      if (!cartItem.product) {
        continue;
      }
      const product = cartItem.product;
      const variant = cartItem.productVariant;

      const price = variant?.sellingPrice || product.sellingPrice;
      const itemTotal = price * cartItem.quantity;

      subtotal += itemTotal;

      orderItems.push({
        productId: String(product.id),
        productVariantId: variant?.id ? String(variant.id) : undefined,
        productName: product.name,
        productImage: variant?.image || product.images?.[0] || "",
        sku: variant?.sku || product.sku || "",
        quantity: cartItem.quantity,
        unitPrice: price,
        sellingPrice: price,
        taxAmount: Math.round(itemTotal * 0.18 * 100) / 100,
        discountAmount: 0,
        totalAmount: itemTotal + Math.round(itemTotal * 0.18 * 100) / 100,
      });
    }

    const shippingAmount = createOrderDto.shippingRate || 0;
    const taxAmount = Math.round(subtotal * 0.18 * 100) / 100;
    const totalAmount = subtotal + shippingAmount + taxAmount;
    const isCOD = createOrderDto.paymentMethod === "cod";

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const order = this.orderRepository.create({
        orderNumber: generateOrderNumber(),
        userId,
        status: isCOD ? OrderStatus.CONFIRMED : OrderStatus.PENDING_PAYMENT,
        subtotal,
        taxAmount,
        shippingAmount,
        discountAmount: 0,
        totalAmount,
        shippingAddress,
        customerNote: createOrderDto.customerNote,
        couponCode: createOrderDto.couponCode,
        selectedCourier: createOrderDto.selectedCourier,
        selectedService: createOrderDto.selectedService,
        shippingRate: createOrderDto.shippingRate,
      });

      const savedOrder = await queryRunner.manager.save(order);

      const orderItemsEntities = orderItems.map((item) => {
        return this.orderItemRepository.create({
          ...item,
          orderId: savedOrder.id,
        });
      });

      await queryRunner.manager.save(orderItemsEntities);

      if (isCOD) {
        const payment = this.paymentRepository.create({
          orderId: savedOrder.id,
          amount: totalAmount,
          status: PaymentStatus.PENDING,
          method: PaymentMethod.COD,
        });
        await queryRunner.manager.save(payment);

        for (const item of orderItems) {
          await this.inventoryService.reserveStock(
            item.productId!,
            item.quantity!,
          );
        }
      }

      await queryRunner.commitTransaction();
      await this.cartRepository.delete({ userId });

      if (isCOD && shippingAddress) {
        try {
          await this.autoCreateShipment(savedOrder.id, orderItems, shippingAddress);
        } catch (error) {
          this.logger.error('Failed to create shipment automatically:', error);
        }
      }

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  private async autoCreateShipment(
    orderId: string,
    orderItems: Partial<OrderItem>[],
    shippingAddressJson: string,
  ): Promise<Shipment | null> {
    try {
      let shippingAddress: any;
      try {
        shippingAddress = JSON.parse(shippingAddressJson);
      } catch {
        this.logger.error('Failed to parse shipping address JSON');
        return null;
      }

      const deliveryPincode = shippingAddress?.pincode;
      if (!deliveryPincode) {
        this.logger.error('Delivery pincode not found in shipping address');
        return null;
      }

      // Fetch order with items relation to get product details
      const order = await this.orderRepository.findOne({
        where: { id: orderId },
        relations: ['items', 'items.product'],
      });

      if (!order || !order.items) {
        this.logger.error('Order or items not found');
        return null;
      }

      const orderItemsForShipment = order.items.map((item: any) => ({
        product: item.product,
        quantity: item.quantity,
      }));

      const { totalWeight, length, breadth, height } = this.calculatePackageDimensions(orderItemsForShipment);

      let ratesResponse;
      try {
        ratesResponse = await this.shippingRocketService.calculateRates({
          pickupPincode: this.warehousePincode,
          deliveryPincode: deliveryPincode,
          weight: totalWeight,
          length: length || 10,
          breadth: breadth || 10,
          height: height || 10,
        });
      } catch (error) {
        this.logger.error('Failed to calculate shipping rates:', error);
        return null;
      }

      const couriers = ratesResponse?.couriers || [];
      if (couriers.length === 0) {
        this.logger.error('No couriers available for shipping');
        return null;
      }

      couriers.sort((a: any, b: any) => a.rate - b.rate);
      const cheapestCourier = couriers[0];

      const shipmentDto = {
        isCOD: order.status === OrderStatus.CONFIRMED,
        deliveryPincode,
        selectedService: cheapestCourier.serviceType,
        selectedCourier: cheapestCourier.name,
        weight: totalWeight,
        length: length || 10,
        breadth: breadth || 10,
        height: height || 10,
      };

      let shipmentData;
      try {
        shipmentData = await this.shippingRocketService.createShipment(shipmentDto, {
          id: order.id,
          orderNumber: order.orderNumber,
          userId: order.userId,
          shippingAddress: shippingAddressJson,
          items: order.items.map((item: any) => ({
            productName: item.productName,
            sku: item.sku,
            quantity: item.quantity,
            sellingPrice: item.sellingPrice,
          })),
        });
      } catch (error) {
        this.logger.error('Failed to create shipment:', error);
        return null;
      }

      const shipment = this.shipmentRepository.create({
        orderId: order.id,
        shippingRocketId: shipmentData.shippingRocketId,
        srOrderId: shipmentData.srOrderId || shipmentData.shippingRocketId,
        trackingNumber: shipmentData.trackingNumber,
        awbNumber: shipmentData.awbNumber,
        courierName: shipmentData.courierName,
        status: ShipmentStatus.PENDING,
        pickupPincode: this.warehousePincode,
        deliveryPincode: deliveryPincode,
        weight: totalWeight,
        length: length || 10,
        breadth: breadth || 10,
        height: height || 10,
        isCOD: true,
      });

      order.selectedCourier = cheapestCourier.name;
      order.selectedService = cheapestCourier.serviceType;
      order.shippingRate = cheapestCourier.rate;
      order.shippingAmount = cheapestCourier.rate;
      await this.orderRepository.save(order);

      return this.shipmentRepository.save(shipment);
    } catch (error) {
      this.logger.error('Error in autoCreateShipment:', error);
      return null;
    }
  }

  private calculatePackageDimensions(orderItems: any[]): {
    totalWeight: number;
    length: number;
    breadth: number;
    height: number;
  } {
    let totalWeight = 0;
    let maxLength = 0;
    let maxBreadth = 0;
    let maxHeight = 0;

    for (const item of orderItems) {
      const product = item.product || {};
      const itemWeight = product.weight || 500;
      const itemLength = product.length || 10;
      const itemBreadth = product.breadth || 10;
      const itemHeight = product.height || 10;
      const quantity = item.quantity || 1;

      totalWeight += itemWeight * quantity;
      maxLength = Math.max(maxLength, itemLength);
      maxBreadth = Math.max(maxBreadth, itemBreadth);
      maxHeight = Math.max(maxHeight, itemHeight);
    }

    return {
      totalWeight: Math.max(totalWeight / 1000, 0.5), // Convert g to kg, min 0.5kg
      length: maxLength || 10,
      breadth: maxBreadth || 10,
      height: maxHeight || 10,
    };
  }

  async findAll(
    userId: string,
    page = 1,
    limit = 10,
  ): Promise<{ orders: any[]; total: number }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("items.product", "product")
      .where("order.userId = :userId", { userId })
      .andWhere("order.status != :failedStatus", {
        failedStatus: OrderStatus.PAYMENT_FAILED,
      })
      .orderBy("order.createdAt", "DESC")
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await queryBuilder.getManyAndCount();

    return {
      orders: orders.map((order) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        subtotal: order.subtotal,
        totalAmount: order.totalAmount,
        shippingAmount: order.shippingAmount,
        discountAmount: order.discountAmount,
        shippingAddress: order.shippingAddress,
        createdAt: order.createdAt,
        items:
          order.items?.map((item) => ({
            id: item.id,
            productId: item.productId,
            productSlug: item.product?.slug || null,
            productVariantId: item.productVariantId,
            productName: item.productName,
            productImage: item.productImage,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            sellingPrice: item.sellingPrice,
            totalAmount: item.totalAmount,
          })) || [],
      })),
      total,
    };
  }

  async findOne(id: string): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: [
        "items",
        "items.product",
        "items.product.category",
        "payments",
        "shipments",
        "user",
      ],
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      ...order,
      items: order.items?.map((item) => ({
        ...item,
        productSlug: item.product?.slug || null,
      })) || [],
    };
  }

  async findByOrderNumber(orderNumber: string, userId: string): Promise<any> {
    const order = await this.orderRepository.findOne({
      where: { orderNumber, userId },
      relations: ["items", "items.product", "items.product.category", "payments", "shipments"],
    });

    if (!order) {
      throw new NotFoundException("Order not found");
    }

    return {
      ...order,
      items: order.items?.map((item) => ({
        ...item,
        productSlug: item.product?.slug || null,
      })) || [],
    };
  }

  async updateStatus(
    id: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
  ): Promise<Order> {
    const order = await this.findOne(id);

    if (updateOrderStatusDto.status !== OrderStatus.CANCELLED) {
      throw new BadRequestException("Only cancellation is allowed. Order status is synced automatically from ShipRocket shipment tracking.");
    }

    order.status = OrderStatus.CANCELLED;
    if (updateOrderStatusDto.adminNote) {
      order.adminNote = updateOrderStatusDto.adminNote;
    }

    if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
      // Cancel shipment on ShipRocket
      const shipment = await this.shipmentRepository.findOne({
        where: { orderId: order.id },
      });
      
      if (shipment?.srOrderId && shipment.status !== ShipmentStatus.CANCELLED && shipment.status !== ShipmentStatus.DELIVERED) {
        try {
          await this.shippingRocketService.cancelShipment(shipment.srOrderId);
          this.logger.log(`Shipment ${shipment.id} cancelled on ShipRocket`);
        } catch (error) {
          this.logger.error(`Failed to cancel shipment on ShipRocket: ${error.message}`);
          // Continue with local cancellation even if ShipRocket fails
        }
        
        shipment.status = ShipmentStatus.CANCELLED;
        await this.shipmentRepository.save(shipment);
      }

      // Release inventory
      for (const item of order.items) {
        await this.inventoryService.releaseStock(item.productId, item.quantity);
      }
    }

    return this.orderRepository.save(order);
  }

  async getOrdersForAdmin(
    page = 1,
    limit = 10,
    status?: string,
  ): Promise<{ orders: Order[]; total: number }> {
    const queryBuilder = this.orderRepository
      .createQueryBuilder("order")
      .leftJoinAndSelect("order.items", "items")
      .leftJoinAndSelect("order.user", "user")
      .orderBy("order.createdAt", "DESC");

    if (status) {
      queryBuilder.andWhere("order.status = :status", { status });
    }

    const [orders, total] = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { orders, total };
  }

  async getOrderByIdForAdmin(id: string): Promise<Order> {
    return this.findOne(id);
  }

  async cancelOrder(
    id: string,
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const order = await this.findOne(id);

    if (order.userId !== userId) {
      throw new BadRequestException("You can only cancel your own orders");
    }

    if (order.status === OrderStatus.PENDING_PAYMENT) {
      await this.orderItemRepository.delete({ orderId: id });
      await this.orderRepository.delete(id);
      return { success: true, message: "Order cancelled" };
    }

    if (![OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(order.status)) {
      throw new BadRequestException("Cannot cancel order in current status");
    }

    order.status = OrderStatus.CANCELLED;

    // Cancel shipment on ShipRocket
    const shipment = order.shipments?.[0];
    if (shipment?.srOrderId && shipment.status !== ShipmentStatus.CANCELLED && shipment.status !== ShipmentStatus.DELIVERED) {
      try {
        await this.shippingRocketService.cancelShipment(shipment.srOrderId);
        this.logger.log(`Shipment ${shipment.id} cancelled on ShipRocket`);
      } catch (error) {
        this.logger.error(`Failed to cancel shipment on ShipRocket: ${error.message}`);
      }
      
      shipment.status = ShipmentStatus.CANCELLED;
      await this.shipmentRepository.save(shipment);
    }

    // Release inventory
    for (const item of order.items) {
      await this.inventoryService.releaseStock(item.productId, item.quantity);
    }

    await this.orderRepository.save(order);
    return { success: true, message: "Order cancelled" };
  }

  async getTrackingHistory(orderId: string): Promise<{
    shipment: any;
    timeline: any[];
  }> {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['shipments', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const shipment = order.shipments?.[0];
    
    if (!shipment) {
      return {
        shipment: null,
        timeline: [],
      };
    }

    const history = await this.trackingHistoryRepository.find({
      where: { shipmentId: shipment.id },
      order: { createdAt: 'ASC' },
    });

    const timeline = history.map((item) => ({
      event: item.eventType,
      status: item.status,
      location: item.location,
      remarks: item.remarks,
      timestamp: item.createdAt,
      courierName: item.courierName,
    }));

    return {
      shipment: {
        id: shipment.id,
        shippingRocketId: shipment.shippingRocketId,
        awbNumber: shipment.awbNumber,
        trackingNumber: shipment.trackingNumber,
        courierName: shipment.courierName,
        status: shipment.status,
        isCOD: shipment.isCOD,
        lastWebhookEvent: shipment.lastWebhookEvent,
        lastWebhookAt: shipment.lastWebhookAt,
      },
      timeline,
    };
  }
}
