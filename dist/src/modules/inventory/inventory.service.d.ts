import { Repository } from 'typeorm';
import { Inventory, Product } from '../../database/entities';
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';
export declare class InventoryService {
    private inventoryRepository;
    private productRepository;
    constructor(inventoryRepository: Repository<Inventory>, productRepository: Repository<Product>);
    create(createInventoryDto: CreateInventoryDto): Promise<Inventory>;
    findAll(page?: number, limit?: number): Promise<{
        inventory: Inventory[];
        total: number;
    }>;
    findOne(id: string): Promise<Inventory>;
    findByProduct(productId: string): Promise<Inventory[]>;
    getAvailableQuantity(productId: string): Promise<number>;
    update(id: string, updateInventoryDto: UpdateInventoryDto): Promise<Inventory>;
    remove(id: string): Promise<void>;
    reserveStock(productId: string, quantity: number): Promise<boolean>;
    releaseStock(productId: string, quantity: number): Promise<void>;
    deductStock(productId: string, quantity: number): Promise<void>;
    getLowStockProducts(threshold?: number): Promise<Inventory[]>;
    getOutOfStockProducts(): Promise<Inventory[]>;
}
