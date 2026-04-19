import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Shipment } from './shipment.entity';

@Entity('shipment_tracking_history')
export class ShipmentTrackingHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'shipment_id' })
  shipmentId: string;

  @ManyToOne(() => Shipment, (shipment) => shipment.trackingHistory)
  @JoinColumn({ name: 'shipment_id' })
  shipment: Shipment;

  @Column({ name: 'event_type' })
  eventType: string;

  @Column()
  status: string;

  @Column({ nullable: true })
  location: string;

  @Column({ type: 'text', nullable: true })
  remarks: string;

  @Column({ name: 'courier_name', nullable: true })
  courierName: string;

  @Column({ name: 'awb_number', nullable: true })
  awbNumber: string;

  @Column({ name: 'tracking_number', nullable: true })
  trackingNumber: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'courier_charges' })
  courierCharges: number;

  @Column({ name: 'received_at', type: 'datetime' })
  receivedAt: Date;

  @CreateDateColumn()
  createdAt: Date;
}