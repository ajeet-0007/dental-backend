import { Order } from './order.entity';
export declare enum ShipmentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SHIPPED = "shipped",
    OUT_FOR_DELIVERY = "out_for_delivery",
    DELIVERED = "delivered",
    FAILED = "failed",
    RETURNED = "returned"
}
export declare class Shipment {
    id: string;
    orderId: string;
    order: Order;
    status: ShipmentStatus;
    carrier: string;
    trackingNumber: string;
    trackingUrl: string;
    shipDate: Date;
    deliveryDate: Date;
    estimatedDeliveryDate: Date;
    shippingAddress: string;
    customerNote: string;
    createdAt: Date;
    updatedAt: Date;
}
