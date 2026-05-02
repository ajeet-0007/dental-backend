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
import { Product } from './product.entity';
import { VariantOption } from './variant-option.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  productId: string;

  @ManyToOne(() => Product, (product) => product.variants)
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column({ nullable: true })
  name: string;

  @Column({ nullable: true })
  sku: string;

  @Column({ default: 0 })
  sellingPrice: number;

  @Column({ default: 0 })
  mrp: number;

  @Column({ default: 0 })
  weight: number;

  @Column({ nullable: true })
  weightUnit: string;

  @Column({ nullable: true })
  image: string;

  @Column('simple-array', { nullable: true })
  images: string[];

  @Column({ nullable: true })
  color: string;

  @Column({ nullable: true })
  size: string;

  @Column({ nullable: true })
  flavor: string;

  @Column({ default: 1 })
  packQuantity: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true, type: 'datetime' })
  expiresAt: Date | null;

  @Column({ nullable: true, name: 'variantKey' })
  variantKey: string;

  @OneToMany(() => VariantOption, (vo) => vo.variant)
  variantOptions: VariantOption[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
