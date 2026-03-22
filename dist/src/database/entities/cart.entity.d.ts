import { User } from './user.entity';
import { Product } from './product.entity';
import { ProductVariant } from './product-variant.entity';
export declare class Cart {
    id: string;
    userId: string;
    user: User;
    productId: string;
    product: Product;
    productVariantId: string;
    productVariant: ProductVariant;
    quantity: number;
    createdAt: Date;
    updatedAt: Date;
}
