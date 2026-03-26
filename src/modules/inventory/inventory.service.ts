import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory, Product } from '../../database/entities';
import { CreateInventoryDto, UpdateInventoryDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async create(createInventoryDto: CreateInventoryDto): Promise<Inventory> {
    const inventory = this.inventoryRepository.create(createInventoryDto as any);
    return this.inventoryRepository.save(inventory) as any;
  }

  async findAll(page = 1, limit = 10): Promise<{ inventory: Inventory[]; total: number }> {
    const [inventory, total] = await this.inventoryRepository.findAndCount({
      relations: ['product'],
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });

    return { inventory, total };
  }

  async findOne(id: string): Promise<Inventory> {
    const inventory = await this.inventoryRepository.findOne({
      where: { id },
      relations: ['product'],
    });

    if (!inventory) {
      throw new NotFoundException('Inventory not found');
    }

    return inventory;
  }

  async findByProduct(productId: string): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      where: { productId },
      order: { warehouseLocation: 'ASC' },
    });
  }

  async getAvailableQuantity(productId: string): Promise<number> {
    const inventory = await this.inventoryRepository.find({
      where: { productId },
    });

    return inventory.reduce((total, inv) => {
      return total + (inv.quantity - inv.reservedQuantity);
    }, 0);
  }

  async update(
    id: string,
    updateInventoryDto: UpdateInventoryDto,
  ): Promise<Inventory> {
    const inventory = await this.findOne(id);
    Object.assign(inventory, updateInventoryDto);
    return this.inventoryRepository.save(inventory);
  }

  async remove(id: string): Promise<void> {
    const inventory = await this.findOne(id);
    await this.inventoryRepository.remove(inventory);
  }

  async reserveStock(productId: string, quantity: number): Promise<boolean> {
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
      } else {
        inventory.reservedQuantity = inventory.quantity;
        await this.inventoryRepository.save(inventory);
        remaining -= available;
      }
    }

    return false;
  }

  async releaseStock(productId: string, quantity: number): Promise<void> {
    const inventories = await this.inventoryRepository.find({
      where: { productId },
    });

    let remaining = quantity;

    for (const inventory of inventories) {
      if (inventory.reservedQuantity >= remaining) {
        inventory.reservedQuantity -= remaining;
        await this.inventoryRepository.save(inventory);
        return;
      } else {
        remaining -= inventory.reservedQuantity;
        inventory.reservedQuantity = 0;
        await this.inventoryRepository.save(inventory);
      }
    }
  }

  async deductStock(productId: string, quantity: number): Promise<void> {
    const inventories = await this.inventoryRepository.find({
      where: { productId },
    });

    let remaining = quantity;

    for (const inventory of inventories) {
      if (inventory.quantity >= remaining) {
        inventory.quantity -= remaining;
        await this.inventoryRepository.save(inventory);
        return;
      } else {
        remaining -= inventory.quantity;
        inventory.quantity = 0;
        await this.inventoryRepository.save(inventory);
      }
    }
  }

  async getLowStockProducts(threshold = 10): Promise<Inventory[]> {
    return this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.trackInventory = :trackInventory', { trackInventory: true })
      .andWhere('inventory.quantity <= inventory.lowStockThreshold')
      .andWhere('inventory.quantity > 0')
      .orderBy('inventory.quantity', 'ASC')
      .getMany();
  }

  async getOutOfStockProducts(): Promise<Inventory[]> {
    return this.inventoryRepository
      .createQueryBuilder('inventory')
      .leftJoinAndSelect('inventory.product', 'product')
      .where('inventory.trackInventory = :trackInventory', { trackInventory: true })
      .andWhere('inventory.quantity = 0')
      .getMany();
  }
}
