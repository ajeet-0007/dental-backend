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
import { Shipment } from './shipment.entity';
import { Order } from './order.entity';
import { ReturnItem } from './return-item.entity';
import { ReturnTimeline } from './return-timeline.entity';

export enum ReturnShipmentStatus {
  REQUESTED = 'requested',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SCHEDULED = 'scheduled',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  RECEIVED = 'received',
  QUALITY_CHECK = 'quality_check',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  DAMAGED = 'damaged',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGED_MIND = 'changed_mind',
  OTHER = 'other',
}

export enum RefundMethod {
  ORIGINAL_PAYMENT = 'original_payment',
}

@Entity('return_shipments')
export class ReturnShipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  orderId: string;

  @ManyToOne(() => Order)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @Column()
  shipmentId: string;

  @ManyToOne(() => Shipment)
  @JoinColumn({ name: 'shipmentId' })
  shipment: Shipment;

  @Column()
  userId: string;

  @Column({ type: 'enum', enum: ReturnReason })
  reason: ReturnReason;

  @Column({ nullable: true, type: 'text' })
  comments: string;

  @Column({ type: 'enum', enum: ReturnShipmentStatus, default: ReturnShipmentStatus.REQUESTED })
  status: ReturnShipmentStatus;

  @Column({ default: false })
  eligibleForAutoApprove: boolean;

  @Column({ default: false })
  isAutoApproved: boolean;

  @Column({ nullable: true })
  adminReviewedBy: string;

  @Column({ nullable: true })
  adminReviewedAt: Date;

  @Column({ nullable: true, type: 'text' })
  adminReviewNotes: string;

  @OneToMany(() => ReturnItem, (item) => item.returnShipment, { cascade: true })
  items: ReturnItem[];

  @OneToMany(() => ReturnTimeline, (timeline) => timeline.returnShipment, { cascade: true })
  timeline: ReturnTimeline[];

  @Column({ nullable: true })
  pickupAddress: string;

  @Column({ nullable: true })
  pickupCity: string;

  @Column({ nullable: true })
  pickupState: string;

  @Column({ nullable: true })
  pickupPincode: string;

  @Column({ nullable: true })
  pickupPhone: string;

  @Column({ nullable: true })
  pickupScheduledDate: Date;

  @Column({ nullable: true })
  pickupSlot: string;

  @Column({ nullable: true })
  pickupCompletedDate: Date;

  @Column({ nullable: true })
  receivedDate: Date;

  @Column({ nullable: true, type: 'text' })
  qualityCheckNotes: string;

  @Column({ default: false })
  qualityCheckPassed: boolean;

  @Column({ nullable: true })
  approvedBy: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @Column({ nullable: true })
  returnTrackingNumber: string;

  @Column({ nullable: true })
  returnAwbNumber: string;

  @Column({ nullable: true })
  returnLabelUrl: string;

  @Column({ nullable: true })
  shippingRocketReturnId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  itemTotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 3 })
  shippingDeduction: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ type: 'enum', enum: RefundMethod, nullable: true })
  refundMethod: RefundMethod;

  @Column({ nullable: true })
  refundTransactionId: string;

  @Column({ nullable: true })
  refundProcessedDate: Date;

  @Column({ nullable: true })
  stripeRefundId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
