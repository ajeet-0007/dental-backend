import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ProductOption } from './product-option.entity';

@Entity('product_option_values')
export class ProductOptionValue {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'optionId' })
  optionId: number;

  @ManyToOne(() => ProductOption, (option) => option.values, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'optionId' })
  option: ProductOption;

  @Column({ type: 'varchar', length: 100 })
  value: string;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ type: 'varchar', length: 7, nullable: true })
  hexCode: string | null;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  swatchUrl: string | null;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updatedAt' })
  updatedAt: Date;
}
