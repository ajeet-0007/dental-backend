import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { Shipment } from './shipment.entity';
export declare enum OrderStatus {
    PENDING_PAYMENT = "pending_payment",
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    DELIVERED = "delivered",
    CANCELLED = "cancelled",
    REFUNDED = "refunded",
    PAYMENT_FAILED = "payment_failed"
}
export declare class Order {
    id: string;
    orderNumber: string;
    userId: string;
    user: User;
    status: OrderStatus;
    subtotal: number;
    taxAmount: number;
    shippingAmount: number;
    discountAmount: number;
    totalAmount: number;
    couponCode: string;
    couponDiscount: number;
    shippingAddressId: string;
    shippingAddress: string;
    billingAddressId: string;
    billingAddress: string;
    customerNote: string;
    adminNote: string;
    items: OrderItem[];
    payments: Payment[];
    shipments: Shipment[];
    createdAt: Date;
    updatedAt: Date;
}
