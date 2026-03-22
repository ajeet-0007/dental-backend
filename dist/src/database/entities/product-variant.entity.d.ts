import { Product } from './product.entity';
export declare class ProductVariant {
    id: string;
    productId: string;
    product: Product;
    name: string;
    sku: string;
    price: number;
    sellingPrice: number;
    mrp: number;
    weight: number;
    weightUnit: string;
    image: string;
    images: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
