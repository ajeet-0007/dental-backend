import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Payment, Order, OrderItem } from '../../database/entities';
import { CreatePaymentDto } from './dto/payment.dto';
import { InventoryService } from '../inventory/inventory.service';
export declare class PaymentsService {
    private paymentRepository;
    private orderRepository;
    private orderItemRepository;
    private configService;
    private inventoryService;
    private stripe;
    constructor(paymentRepository: Repository<Payment>, orderRepository: Repository<Order>, orderItemRepository: Repository<OrderItem>, configService: ConfigService, inventoryService: InventoryService);
    createPaymentSession(userId: string, createPaymentDto: CreatePaymentDto): Promise<{
        sessionId: string;
        url: string;
    }>;
    handleWebhook(payload: Buffer, signature: string): Promise<void>;
    private processSuccessfulPayment;
    verifyAndConfirmPayment(sessionId: string): Promise<{
        success: boolean;
        orderId?: string;
        error?: string;
    }>;
    verifyPayment(orderId: string): Promise<Payment>;
    handlePaymentFailure(orderId: string, reason: string): Promise<Payment>;
    getPaymentByOrder(orderId: string): Promise<Payment>;
    getPaymentsForAdmin(page?: number, limit?: number): Promise<{
        payments: Payment[];
        total: number;
    }>;
}
