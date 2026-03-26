import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductVariant } from './product-variant.entity';
import { ProductOption } from './product-option.entity';
import { ProductOptionValue } from './product-option-value.entity';

@Entity('variant_options')
export class VariantOption {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 36, name: 'variantId' })
  variantId: string;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variantId' })
  variant: ProductVariant;

  @Column({ type: 'int', name: 'optionId' })
  optionId: number;

  @ManyToOne(() => ProductOption, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optionId' })
  option: ProductOption;

  @Column({ type: 'int', name: 'optionValueId' })
  optionValueId: number;

  @ManyToOne(() => ProductOptionValue, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optionValueId' })
  optionValue: ProductOptionValue;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
