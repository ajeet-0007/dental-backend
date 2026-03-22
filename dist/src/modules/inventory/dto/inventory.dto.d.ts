export declare class CreateInventoryDto {
    productId: string;
    productVariantId?: string;
    warehouseLocation?: string;
    quantity: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
}
export declare class UpdateInventoryDto {
    quantity?: number;
    reservedQuantity?: number;
    lowStockThreshold?: number;
    trackInventory?: boolean;
    warehouseLocation?: string;
}
