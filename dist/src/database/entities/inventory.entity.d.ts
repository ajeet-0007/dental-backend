import { Product } from './product.entity';
export declare class Inventory {
    id: string;
    productId: string;
    product: Product;
    productVariantId: string;
    warehouseLocation: string;
    quantity: number;
    reservedQuantity: number;
    lowStockThreshold: number;
    trackInventory: boolean;
    createdAt: Date;
    updatedAt: Date;
}
