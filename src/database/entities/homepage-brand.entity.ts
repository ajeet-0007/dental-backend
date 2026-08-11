import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { Brand } from "./brand.entity";

@Entity("homepage_brands")
export class HomepageBrand {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  brandId: number;

  @ManyToOne(() => Brand, (brand) => brand.products)
  @JoinColumn({ name: "brandId" })
  brand: Brand;

  @Column({ default: 0 })
  sortOrder: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
