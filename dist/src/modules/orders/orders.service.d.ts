import { Repository, DataSource } from "typeorm";
import { Order, OrderItem, Cart, Product, ProductVariant, Inventory, Address, Payment } from "../../database/entities";
import { CreateOrderDto, UpdateOrderStatusDto } from "./dto/order.dto";
import { InventoryService } from "../inventory/inventory.service";
export declare class OrdersService {
    private orderRepository;
    private orderItemRepository;
    private cartRepository;
    private productRepository;
    private productVariantRepository;
    private inventoryRepository;
    private addressRepository;
    private paymentRepository;
    private inventoryService;
    private dataSource;
    constructor(orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, cartRepository: Repository<Cart>, productRepository: Repository<Product>, productVariantRepository: Repository<ProductVariant>, inventoryRepository: Repository<Inventory>, addressRepository: Repository<Address>, paymentRepository: Repository<Payment>, inventoryService: InventoryService, dataSource: DataSource);
    create(userId: string, createOrderDto: CreateOrderDto): Promise<Order>;
    findAll(userId: string, page?: number, limit?: number): Promise<{
        orders: any[];
        total: number;
    }>;
    findOne(id: string): Promise<Order>;
    findByOrderNumber(orderNumber: string, userId: string): Promise<Order>;
    updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<Order>;
    getOrdersForAdmin(page?: number, limit?: number, status?: string): Promise<{
        orders: Order[];
        total: number;
    }>;
    getOrderByIdForAdmin(id: string): Promise<Order>;
    cancelOrder(id: string, userId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
