import { RawBodyRequest } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/payment.dto';
import { Request as ExpressRequest } from 'express';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createCheckoutSession(req: any, createPaymentDto: CreatePaymentDto): Promise<{
        sessionId: string;
        url: string;
    }>;
    handleWebhook(req: RawBodyRequest<ExpressRequest>, signature: string): Promise<void>;
    verifyPayment(orderId: string): Promise<import("../../database/entities").Payment>;
    verifySession(body: {
        sessionId: string;
    }): Promise<{
        success: boolean;
        orderId?: string;
        error?: string;
    }>;
    getPaymentByOrder(orderId: string): Promise<import("../../database/entities").Payment>;
    getPaymentsForAdmin(page?: number, limit?: number): Promise<{
        payments: import("../../database/entities").Payment[];
        total: number;
    }>;
}
