export declare class OrderItemDto {
    productId: string;
    productVariantId?: string;
    quantity: number;
}
export declare class CreateOrderDto {
    addressId?: string;
    shippingAddress?: string;
    phone?: string;
    paymentMethod?: string;
    couponCode?: string;
    customerNote?: string;
}
export declare class UpdateOrderStatusDto {
    status: string;
    adminNote?: string;
}
export declare class CancelOrderDto {
    reason?: string;
}
