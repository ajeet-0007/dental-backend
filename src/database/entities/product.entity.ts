import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { Category } from "./category.entity";
import { ProductVariant } from "./product-variant.entity";
import { Inventory } from "./inventory.entity";
import { Review } from "./review.entity";
import { Cart } from "./cart.entity";
import { OrderItem } from "./order-item.entity";

@Entity("products")
export class Product {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "text", nullable: true })
  shortDescription: string;

  @Column({ nullable: true })
  sku: string;

  @Column({ default: 0 })
  price: number;

  @Column({ default: 0 })
  sellingPrice: number;

  @Column({ default: 0 })
  mrp: number;

  @Column({ nullable: true })
  brand: string;

  @Column({ default: "unit" })
  unit: string;

  @Column({ default: 0 })
  minOrderQuantity: number;

  @Column("json", { nullable: true })
  images: string[];

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isFeatured: boolean;

  @Column({ default: false })
  isReturnable: boolean;

  @Column({ default: 0 })
  returnDays: number;

  @Column({ nullable: true })
  categoryId: string;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: "categoryId" })
  category: Category;

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => Inventory, (inventory) => inventory.product)
  inventories: Inventory[];

  @OneToMany(() => Review, (review) => review.product)
  reviews: Review[];

  @OneToMany(() => Cart, (cart) => cart.product)
  cartItems: Cart[];

  @OneToMany(() => OrderItem, (item) => item.product)
  orderItems: OrderItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
