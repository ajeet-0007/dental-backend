import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Department } from "./department.entity";

@Entity("homepage_departments")
export class HomepageDepartment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  departmentId: number;

  @ManyToOne(() => Department, (department) => department.products)
  @JoinColumn({ name: "departmentId" })
  department: Department;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
