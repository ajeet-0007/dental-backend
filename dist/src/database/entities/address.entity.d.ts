import { User } from './user.entity';
export declare class Address {
    id: number;
    userId: string;
    user: User;
    name: string;
    phone: string;
    addressLine1: string;
    addressLine2: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
    isDefault: boolean;
    landmark: string;
    createdAt: Date;
    updatedAt: Date;
}
