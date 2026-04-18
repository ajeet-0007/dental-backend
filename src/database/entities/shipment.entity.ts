import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Order } from './order.entity';

export enum ShipmentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  OUT_FOR_DELIVERY = 'out_for_delivery',
  DELIVERED = 'delivered',
  FAILED = 'failed',
  RTO = 'rto',
  CANCELLED = 'cancelled',
}

@Entity('shipments')
export class Shipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order, (order) => order.shipments)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  // ShippingRocket Integration
  @Column({ nullable: true })
  shippingRocketId: string;

  @Column({ nullable: true })
  courierName: string;

  @Column({ nullable: true })
  courierServiceType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingRate: number;

  @Column({ default: false })
  isCOD: boolean;

  // Pickup Details
  @Column({ nullable: true })
  pickupPincode: string;

  @Column({ nullable: true })
  pickupAddressId: string;

  // Delivery Details
  @Column({ nullable: true })
  deliveryPincode: string;

  @Column({ nullable: true })
  customerAddressId: string;

  // Package Info
  @Column({ type: 'decimal', precision: 8, scale: 2, nullable: true })
  weight: number;

  @Column({ nullable: true })
  length: number;

  @Column({ nullable: true })
  breadth: number;

  @Column({ nullable: true })
  height: number;

  // Tracking Info
  @Column({ default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

   @Column({ nullable: true })
   trackingNumber: string;

  @Column({ nullable: true })
  labelUrl: string;

  @Column({ nullable: true })
  awbNumber: string;

  // Dates
  @Column({ nullable: true })
  pickupScheduledDate: Date;

  @Column({ nullable: true })
  pickupCompletedDate: Date;

  @Column({ nullable: true })
  deliveryAttemptDate: Date;

  @Column({ nullable: true })
  deliveredDate: Date;

  @Column({ nullable: true })
  estimatedDeliveryDate: Date;

  // Return Shipment
  @Column({ nullable: true })
  returnShipmentId: string;

  @Column({ default: false })
  isReturnInitiated: boolean;

  // Legacy fields (kept for backward compatibility)
  @Column({ nullable: true })
  carrier: string;

  @Column({ nullable: true })
  trackingUrl: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  customerNote: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
