"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const entities_1 = require("../../database/entities");
let InventoryService = class InventoryService {
    constructor(inventoryRepository, productRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
    }
    async create(createInventoryDto) {
        const inventory = this.inventoryRepository.create(createInventoryDto);
        return this.inventoryRepository.save(inventory);
    }
    async findAll(page = 1, limit = 10) {
        const [inventory, total] = await this.inventoryRepository.findAndCount({
            relations: ['product'],
            skip: (page - 1) * limit,
            take: limit,
            order: { createdAt: 'DESC' },
        });
        return { inventory, total };
    }
    async findOne(id) {
        const inventory = await this.inventoryRepository.findOne({
            where: { id },
            relations: ['product'],
        });
        if (!inventory) {
            throw new common_1.NotFoundException('Inventory not found');
        }
        return inventory;
    }
    async findByProduct(productId) {
        return this.inventoryRepository.find({
            where: { productId },
            order: { warehouseLocation: 'ASC' },
        });
    }
    async getAvailableQuantity(productId) {
        const inventory = await this.inventoryRepository.find({
            where: { productId },
        });
        return inventory.reduce((total, inv) => {
            return total + (inv.quantity - inv.reservedQuantity);
        }, 0);
    }
    async update(id, updateInventoryDto) {
        const inventory = await this.findOne(id);
        Object.assign(inventory, updateInventoryDto);
        return this.inventoryRepository.save(inventory);
    }
    async remove(id) {
        const inventory = await this.findOne(id);
        await this.inventoryRepository.remove(inventory);
    }
    async reserveStock(productId, quantity) {
        const inventories = await this.inventoryRepository.find({
            where: { productId },
        });
        let remaining = quantity;
        for (const inventory of inventories) {
            const available = inventory.quantity - inventory.reservedQuantity;
            if (available >= remaining) {
                inventory.reservedQuantity += remaining;
                await this.inventoryRepository.save(inventory);
                return true;
            }
            else {
                inventory.reservedQuantity = inventory.quantity;
                await this.inventoryRepository.save(inventory);
                remaining -= available;
            }
        }
        return false;
    }
    async releaseStock(productId, quantity) {
        const inventories = await this.inventoryRepository.find({
            where: { productId },
        });
        let remaining = quantity;
        for (const inventory of inventories) {
            if (inventory.reservedQuantity >= remaining) {
                inventory.reservedQuantity -= remaining;
                await this.inventoryRepository.save(inventory);
                return;
            }
            else {
                remaining -= inventory.reservedQuantity;
                inventory.reservedQuantity = 0;
                await this.inventoryRepository.save(inventory);
            }
        }
    }
    async deductStock(productId, quantity) {
        const inventories = await this.inventoryRepository.find({
            where: { productId },
        });
        let remaining = quantity;
        for (const inventory of inventories) {
            if (inventory.quantity >= remaining) {
                inventory.quantity -= remaining;
                await this.inventoryRepository.save(inventory);
                return;
            }
            else {
                remaining -= inventory.quantity;
                inventory.quantity = 0;
                await this.inventoryRepository.save(inventory);
            }
        }
    }
    async getLowStockProducts(threshold = 10) {
        return this.inventoryRepository
            .createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.product', 'product')
            .where('inventory.trackInventory = :trackInventory', { trackInventory: true })
            .andWhere('inventory.quantity <= inventory.lowStockThreshold')
            .andWhere('inventory.quantity > 0')
            .orderBy('inventory.quantity', 'ASC')
            .getMany();
    }
    async getOutOfStockProducts() {
        return this.inventoryRepository
            .createQueryBuilder('inventory')
            .leftJoinAndSelect('inventory.product', 'product')
            .where('inventory.trackInventory = :trackInventory', { trackInventory: true })
            .andWhere('inventory.quantity = 0')
            .getMany();
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(entities_1.Inventory)),
    __param(1, (0, typeorm_1.InjectRepository)(entities_1.Product)),
    __metadata("design:paramtypes", [typeorm_2.Repository,
        typeorm_2.Repository])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map