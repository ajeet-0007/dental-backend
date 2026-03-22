import { Order } from './order.entity';
export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded",
    CANCELLED = "cancelled"
}
export declare enum PaymentMethod {
    CARD = "card",
    UPI = "upi",
    NETBANKING = "netbanking",
    WALLET = "wallet",
    COD = "cod"
}
export declare class Payment {
    id: string;
    orderId: string;
    order: Order;
    amount: number;
    status: PaymentStatus;
    method: PaymentMethod;
    transactionId: string;
    gatewayPaymentId: string;
    gatewayOrderId: string;
    gatewayResponse: string;
    failureReason: string;
    refundAmount: number;
    createdAt: Date;
    updatedAt: Date;
}
