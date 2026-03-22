import { InventoryService } from './inventory.service';
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';
export declare class InventoryController {
    private readonly inventoryService;
    constructor(inventoryService: InventoryService);
    findAll(page?: number, limit?: number): Promise<{
        inventory: import("../../database/entities").Inventory[];
        total: number;
    }>;
    getLowStock(threshold?: number): Promise<import("../../database/entities").Inventory[]>;
    getOutOfStock(): Promise<import("../../database/entities").Inventory[]>;
    findOne(id: string): Promise<import("../../database/entities").Inventory>;
    findByProduct(productId: string): Promise<import("../../database/entities").Inventory[]>;
    getAvailableQuantity(productId: string): Promise<{
        productId: string;
        availableQuantity: number;
    }>;
    create(createInventoryDto: CreateInventoryDto): Promise<import("../../database/entities").Inventory>;
    update(id: string, updateInventoryDto: UpdateInventoryDto): Promise<import("../../database/entities").Inventory>;
    remove(id: string): Promise<void>;
}
