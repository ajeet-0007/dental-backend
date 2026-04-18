import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Shipment } from './shipment.entity';

export enum ReturnShipmentStatus {
  REQUESTED = 'requested',
  SCHEDULED = 'scheduled',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  RECEIVED = 'received',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum ReturnReason {
  DEFECTIVE = 'defective',
  WRONG_ITEM = 'wrong_item',
  DAMAGED = 'damaged',
  NOT_AS_DESCRIBED = 'not_as_described',
  CHANGED_MIND = 'changed_mind',
  OTHER = 'other',
}

@Entity('return_shipments')
export class ReturnShipment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  shipmentId: string;

  @ManyToOne(() => Shipment)
  @JoinColumn({ name: 'shipmentId' })
  shipment: Shipment;

  @Column({ type: 'enum', enum: ReturnReason })
  reason: ReturnReason;

  @Column({ nullable: true, type: 'text' })
  comments: string;

  @Column({ type: 'enum', enum: ReturnShipmentStatus, default: ReturnShipmentStatus.REQUESTED })
  status: ReturnShipmentStatus;

  // Return tracking
  @Column({ nullable: true })
  returnTrackingNumber: string;

  @Column({ nullable: true })
  returnLabelUrl: string;

  @Column({ nullable: true })
  shippingRocketReturnId: string;

  // Dates
  @Column({ nullable: true })
  pickupScheduledDate: Date;

  @Column({ nullable: true })
  pickupCompletedDate: Date;

  @Column({ nullable: true })
  receivedDate: Date;

  @Column({ nullable: true })
  refundProcessedDate: Date;

  // Refund info
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  refundAmount: number;

  @Column({ nullable: true })
  refundTransactionId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
