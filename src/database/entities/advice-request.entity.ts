import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("advice_requests")
export class AdviceRequest {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  doctorName: string;

  @Column({ nullable: true })
  clinicName: string;

  @Column()
  email: string;

  @Column({ nullable: true })
  phone: string;

  @Column()
  equipmentName: string;

  @Column()
  equipmentCategory: string;

  @Column({ nullable: true })
  equipmentBrand: string;

  @Column("text")
  problemDescription: string;

  @Column({ type: "varchar", length: 20, default: "pending" })
  status: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  userId: string;

  @Column({ nullable: true, type: "text" })
  adminNotes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
