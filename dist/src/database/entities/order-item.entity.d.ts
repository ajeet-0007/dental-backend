import { Order } from './order.entity';
import { Product } from './product.entity';
export declare class OrderItem {
    id: string;
    orderId: string;
    order: Order;
    productId: string;
    product: Product;
    productVariantId: string;
    productName: string;
    productImage: string;
    sku: string;
    quantity: number;
    price: number;
    sellingPrice: number;
    taxAmount: number;
    discountAmount: number;
    totalAmount: number;
    createdAt: Date;
    updatedAt: Date;
}
