import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./user.entity";
import { Product } from "./product.entity";

@Entity("wishlists")
export class Wishlist {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column()
  userId: string;

  @Column()
  productId: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => User, (user) => user.wishlists)
  @JoinColumn({ name: "userId" })
  user: User;

  @ManyToOne(() => Product)
  @JoinColumn({ name: "productId" })
  product: Product;
}
