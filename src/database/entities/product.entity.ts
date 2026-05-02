import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  ManyToMany,
  JoinColumn,
  JoinTable,
} from "typeorm";
import { Category } from "./category.entity";
import { ProductVariant } from "./product-variant.entity";
import { Inventory } from "./inventory.entity";
import { Review } from "./review.entity";
import { Cart } from "./cart.entity";
import { OrderItem } from "./order-item.entity";
import { ProductOption } from "./product-option.entity";
import { Brand } from "./brand.entity";
import { Department } from "./department.entity";

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
  sellingPrice: number;

  @Column({ default: 0 })
  mrp: number;

  @Column({ nullable: true })
  brand: string;

  @Column({ nullable: true })
  brandId: number;

  @ManyToOne(() => Brand, (brand) => brand.products)
  @JoinColumn({ name: "brandId" })
  brandEntity: Brand;

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
  expiresAt: Date;

  @Column({ type: "json", nullable: true })
  features: string[];

  @Column({ type: "text", nullable: true })
  keySpecifications: string;

  @Column({ nullable: true })
  packaging: string;

  @Column({ type: "text", nullable: true })
  directionToUse: string;

  @Column({ type: "text", nullable: true })
  additionalInfo: string;

  @Column({ type: "longtext", nullable: true })
  warranty: string;

  @Column({ default: 0 })
  weight: number;

  @Column({ default: 'g' })
  weightUnit: string;

  @Column({ default: 0 })
  length: number;

  @Column({ default: 0 })
  breadth: number;

  @Column({ default: 0 })
  height: number;

  @Column({ default: 'cm' })
  dimensionUnit: string;

  @Column({ nullable: true })
  categoryId: string;

  @Column({ name: 'hasVariants', default: false })
  hasVariants: boolean;

  @ManyToOne(() => Category, (category) => category.products)
  @JoinColumn({ name: "categoryId" })
  category: Category;

  @ManyToMany(() => Department, (department) => department.products)
  @JoinTable({
    name: "product_departments",
    joinColumn: { name: "productId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "departmentId", referencedColumnName: "id" },
  })
  departments: Department[];

  @OneToMany(() => ProductVariant, (variant) => variant.product)
  variants: ProductVariant[];

  @OneToMany(() => ProductOption, (option) => option.product)
  options: ProductOption[];

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
