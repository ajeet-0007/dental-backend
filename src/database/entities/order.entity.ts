import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';
import { Payment } from './payment.entity';
import { Shipment } from './shipment.entity';

export enum OrderStatus {
  PENDING_PAYMENT = 'pending_payment',
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  SHIPPED = 'shipped',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
  PAYMENT_FAILED = 'payment_failed',
}

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  orderNumber: string;

  @Column()
  userId: string;

  @ManyToOne(() => User, (user) => user.orders)
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ nullable: true })
  couponCode: string;

  @Column({ nullable: true })
  couponDiscount: number;

  @Column({ nullable: true })
  shippingAddressId: string;

  @Column({ nullable: true, type: 'text' })
  shippingAddress: string;

  @Column({ nullable: true })
  billingAddressId: string;

  @Column({ nullable: true, type: 'text' })
  billingAddress: string;

  @Column({ nullable: true })
  customerNote: string;

  @Column({ nullable: true })
  adminNote: string;

  // ShippingRocket Integration Fields
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingRate: number;

  @Column({ nullable: true })
  selectedCourier: string;

  @Column({ nullable: true })
  selectedService: string;

  @Column({ nullable: true })
  shipmentId: string;

  @Column({ nullable: true })
  trackingNumber: string;

  @Column({ nullable: true })
  shippingStatus: string;

  @Column({ nullable: true })
  returnShipmentId: string;

  @Column({ default: false })
  isReturned: boolean;

  @Column({ nullable: true })
  returnInitiatedDate: Date;

  // Inventory tracking
  @Column({ default: false })
  inventoryReserved: boolean;

  @Column({ default: false })
  inventoryDeducted: boolean;

  @OneToMany(() => OrderItem, (item) => item.order)
  items: OrderItem[];

  @OneToMany(() => Payment, (payment) => payment.order)
  payments: Payment[];

  @OneToMany(() => Shipment, (shipment) => shipment.order)
  shipments: Shipment[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
