import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('inventory')
export class Inventory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: number;

  @ManyToOne(() => Product, (product) => product.inventories)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  productVariantId: string;

  @Column({ default: 'default' })
  warehouseLocation: string;

  @Column({ default: 0 })
  quantity: number;

  @Column({ default: 0 })
  reservedQuantity: number;

  @Column({ default: 0 })
  lowStockThreshold: number;

  @Column({ default: true })
  trackInventory: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
