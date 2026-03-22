export declare class CreateShippingMethodDto {
    name: string;
    slug?: string;
    description?: string;
    baseCost: number;
    costPerKg?: number;
    freeShippingMinAmount?: number;
    estimatedDays?: number;
    isActive?: boolean;
}
export declare class UpdateShippingMethodDto {
    name?: string;
    description?: string;
    baseCost?: number;
    costPerKg?: number;
    freeShippingMinAmount?: number;
    estimatedDays?: number;
    isActive?: boolean;
}
export declare class UpdateShipmentDto {
    status?: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
}
