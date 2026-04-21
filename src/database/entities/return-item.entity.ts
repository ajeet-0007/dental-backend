import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReturnShipment } from './return-shipment.entity';
import { OrderItem } from './order-item.entity';

export enum ReturnItemCondition {
  NEW = 'new',
  OPEN_BOX = 'open_box',
  USED = 'used',
  DEFECTIVE = 'defective',
}

@Entity('return_items')
export class ReturnItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  returnShipmentId: string;

  @ManyToOne(() => ReturnShipment, (returnShipment) => returnShipment.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'returnShipmentId' })
  returnShipment: ReturnShipment;

  @Column()
  orderItemId: string;

  @ManyToOne(() => OrderItem)
  @JoinColumn({ name: 'orderItemId' })
  orderItem: OrderItem;

  @Column()
  productId: string;

  @Column({ nullable: true })
  productVariantId: string;

  @Column()
  productName: string;

  @Column({ nullable: true })
  productImage: string;

  @Column()
  sku: string;

  @Column({ default: 1 })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalPrice: number;

  @Column({ type: 'enum', enum: ReturnItemCondition, default: ReturnItemCondition.NEW })
  condition: ReturnItemCondition;

  @Column({ type: 'simple-array', nullable: true })
  images: string[];

  @Column({ nullable: true })
  conditionNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
