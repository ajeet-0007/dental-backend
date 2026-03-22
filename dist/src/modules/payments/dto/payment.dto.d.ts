export declare class CreatePaymentDto {
    orderId: string;
    paymentMethod?: string;
}
export declare class VerifyPaymentDto {
    razorpayPaymentId?: string;
    razorpayOrderId?: string;
    razorpaySignature?: string;
}
