import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from "typeorm";

@Entity("payment_intents")
export class PaymentIntent {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  @Index()
  userId: string;

  @Column("text")
  orderData: string; // JSON string of order data

  @Column({ default: false })
  used: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
