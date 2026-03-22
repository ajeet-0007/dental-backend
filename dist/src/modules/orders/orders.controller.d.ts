import { OrdersService } from './orders.service';
import { CreateOrderDto, UpdateOrderStatusDto, CancelOrderDto } from './dto/order.dto';
export declare class OrdersController {
    private readonly ordersService;
    constructor(ordersService: OrdersService);
    create(req: any, createOrderDto: CreateOrderDto): Promise<import("../../database/entities").Order>;
    findAll(req: any, page?: number, limit?: number): Promise<{
        orders: any[];
        total: number;
    }>;
    findOne(id: string): Promise<import("../../database/entities").Order>;
    findByOrderNumber(req: any, orderNumber: string): Promise<import("../../database/entities").Order>;
    cancelOrder(req: any, id: string, cancelOrderDto: CancelOrderDto): Promise<{
        success: boolean;
        message: string;
    }>;
    getOrdersForAdmin(page?: number, limit?: number, status?: string): Promise<{
        orders: import("../../database/entities").Order[];
        total: number;
    }>;
    getOrderByIdForAdmin(id: string): Promise<import("../../database/entities").Order>;
    updateStatus(id: string, updateOrderStatusDto: UpdateOrderStatusDto): Promise<import("../../database/entities").Order>;
}
