import { User } from './user.entity';
import { Product } from './product.entity';
export declare class Review {
    id: string;
    userId: string;
    user: User;
    productId: string;
    product: Product;
    rating: number;
    title: string;
    comment: string;
    isVerified: boolean;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
