import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ReturnShipment } from './return-shipment.entity';

export enum ReturnTimelineAction {
  RETURN_INITIATED = 'return_initiated',
  RETURN_APPROVED = 'return_approved',
  RETURN_REJECTED = 'return_rejected',
  RETURN_CANCELLED = 'return_cancelled',
  LABEL_GENERATED = 'label_generated',
  PICKUP_SCHEDULED = 'pickup_scheduled',
  PICKUP_COMPLETED = 'pickup_completed',
  IN_TRANSIT = 'in_transit',
  RECEIVED_AT_WAREHOUSE = 'received_at_warehouse',
  QUALITY_CHECK_PASSED = 'quality_check_passed',
  QUALITY_CHECK_FAILED = 'quality_check_failed',
  REFUND_INITIATED = 'refund_initiated',
  REFUND_COMPLETED = 'refund_completed',
  IMAGES_UPLOADED = 'images_uploaded',
  RESCHEDULED = 'rescheduled',
}

export enum ReturnActor {
  USER = 'user',
  ADMIN = 'admin',
  SYSTEM = 'system',
}

@Entity('return_timeline')
export class ReturnTimeline {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  returnShipmentId: string;

  @ManyToOne(() => ReturnShipment, (returnShipment) => returnShipment.timeline, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'returnShipmentId' })
  returnShipment: ReturnShipment;

  @Column({ type: 'enum', enum: ReturnTimelineAction })
  action: ReturnTimelineAction;

  @Column({ type: 'enum', enum: ReturnActor, default: ReturnActor.USER })
  actor: ReturnActor;

  @Column({ nullable: true })
  actorId: string;

  @Column({ nullable: true })
  actorName: string;

  @Column({ nullable: true })
  previousStatus: string;

  @Column({ nullable: true })
  newStatus: string;

  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ type: 'simple-json', nullable: true })
  metadata: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
