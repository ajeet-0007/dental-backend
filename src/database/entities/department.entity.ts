import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Product } from "./product.entity";
import { Category } from "./category.entity";

@Entity("departments")
export class Department {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({ unique: true })
  slug: string;

  @Column({ nullable: true, type: "text" })
  description: string;

  @Column({ nullable: true })
  image: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  sortOrder: number;

  @ManyToMany(() => Category, (category) => category.departments)
  @JoinTable({
    name: "category_departments",
    joinColumn: { name: "departmentId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "categoryId", referencedColumnName: "id" },
  })
  categories: Category[];

  @ManyToMany(() => Product, (product) => product.departments)
  @JoinTable({
    name: "product_departments",
    joinColumn: { name: "departmentId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "productId", referencedColumnName: "id" },
  })
  products: Product[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
