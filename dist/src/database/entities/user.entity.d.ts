import { Address } from './address.entity';
import { Order } from './order.entity';
import { Cart } from './cart.entity';
import { Review } from './review.entity';
export declare enum UserRole {
    USER = "user",
    ADMIN = "admin"
}
export declare class User {
    id: string;
    email: string;
    phone: string;
    password: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    refreshToken: string;
    addresses: Address[];
    orders: Order[];
    cartItems: Cart[];
    reviews: Review[];
    createdAt: Date;
    updatedAt: Date;
}
