import {
  Injectable,
  NotFoundException,
  BadRequestException,
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
} from "../../database/entities";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import { generateOrderNumber } from "../../common/utils/slugify";
import { InventoryService } from "../inventory/inventory.service";

@Injectable()
export class OrdersService {
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
    private inventoryService: InventoryService,
    private dataSource: DataSource,
  ) {}

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

      shippingAddress = `${address.name}, ${address.addressLine1}, ${address.addressLine2 || ""}, ${address.city}, ${address.state} - ${address.pincode}`;
    }

    let subtotal = 0;
    const orderItems: Partial<OrderItem>[] = [];

    for (const cartItem of cartItems) {
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
        price: product.price,
        sellingPrice: price,
        taxAmount: Math.round(itemTotal * 0.18 * 100) / 100,
        discountAmount: 0,
        totalAmount: itemTotal + Math.round(itemTotal * 0.18 * 100) / 100,
      });
    }

    const shippingAmount = subtotal > 500 ? 0 : 50;
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

      return this.findOne(savedOrder.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
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
            price: item.price,
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

    if (
      !Object.values(OrderStatus).includes(
        updateOrderStatusDto.status as OrderStatus,
      )
    ) {
      throw new BadRequestException("Invalid order status");
    }

    order.status = updateOrderStatusDto.status as OrderStatus;
    if (updateOrderStatusDto.adminNote) {
      order.adminNote = updateOrderStatusDto.adminNote;
    }

    if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
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

    for (const item of order.items) {
      await this.inventoryService.releaseStock(item.productId, item.quantity);
    }

    await this.orderRepository.save(order);
    return { success: true, message: "Order cancelled" };
  }
}
