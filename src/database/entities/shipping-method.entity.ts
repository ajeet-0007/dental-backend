import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shipping_methods')
export class ShippingMethod {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  costPerKg: number;

  @Column({ default: 0 })
  freeShippingMinAmount: number;

  @Column({ default: 0 })
  estimatedDays: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: true })
  isDefault: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
