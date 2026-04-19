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
import { Order } from './order.entity';
import { ShipmentTrackingHistory } from './shipment-tracking-history.entity';

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

  @OneToMany(() => ShipmentTrackingHistory, (history) => history.shipment)
  trackingHistory: ShipmentTrackingHistory[];

  // ShippingRocket Integration
  @Column({ nullable: true })
  shippingRocketId: string;

  @Column({ nullable: true, name: 'sr_order_id' })
  srOrderId: string;

  @Column({ nullable: true })
  courierName: string;

  @Column({ nullable: true })
  courierServiceType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  shippingRate: number;

  // Actual courier charges from ShipRocket
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'courier_charges' })
  courierCharges: number;

  @Column({ default: false })
  isCOD: boolean;

  // COD amount collected
  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, name: 'cod_collected_amount' })
  codCollectedAmount: number;

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
  manifestUrl: string;

  @Column({ nullable: true })
  invoiceUrl: string;

  @Column({ nullable: true })
  awbNumber: string;

  // Webhook Tracking Timestamps
  @Column({ nullable: true, type: 'datetime', name: 'pickup_scheduled_at' })
  pickupScheduledAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'picked_up_at' })
  pickedUpAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'shipped_at' })
  shippedAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'out_for_delivery_at' })
  outForDeliveryAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'delivery_attempt_at' })
  deliveryAttemptAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'undelivered_at' })
  undeliveredAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'delivered_at' })
  deliveredAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'estimated_delivery_date' })
  estimatedDeliveryDate: Date;

  // NDR Tracking
  @Column({ nullable: true, type: 'text', name: 'ndr_reason' })
  ndrReason: string;

  @Column({ nullable: true, type: 'text', name: 'ndr_remarks' })
  ndrRemarks: string;

  @Column({ default: 0, name: 'ndr_retry_count' })
  ndrRetryCount: number;

  // RTO Tracking
  @Column({ nullable: true, type: 'datetime', name: 'rto_initiated_at' })
  rtoInitiatedAt: Date;

  @Column({ nullable: true, type: 'datetime', name: 'rto_delivered_at' })
  rtoDeliveredAt: Date;

  // Return Shipment
  @Column({ nullable: true, name: 'return_shipment_id' })
  returnShipmentId: string;

  @Column({ nullable: true, name: 'return_awb_number' })
  returnAwbNumber: string;

  @Column({ nullable: true, name: 'return_tracking_number' })
  returnTrackingNumber: string;

  @Column({ default: false, name: 'is_return_initiated' })
  isReturnInitiated: boolean;

  // Webhook Metadata
  @Column({ nullable: true, name: 'last_webhook_event' })
  lastWebhookEvent: string;

  @Column({ nullable: true, type: 'datetime', name: 'last_webhook_at' })
  lastWebhookAt: Date;

  // Legacy fields (kept for backward compatibility)
  @Column({ nullable: true })
  carrier: string;

  @Column({ nullable: true })
  trackingUrl: string;

  @Column({ nullable: true })
  shippingAddress: string;

  @Column({ nullable: true })
  customerNote: string;

  // Deprecated - use pickupScheduledAt
  @Column({ nullable: true })
  pickupScheduledDate: Date;

  // Deprecated - use pickedUpAt
  @Column({ nullable: true })
  pickupCompletedDate: Date;

  // Deprecated - use deliveryAttemptAt
  @Column({ nullable: true })
  deliveryAttemptDate: Date;

  // Deprecated - use deliveredAt
  @Column({ nullable: true })
  deliveredDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
