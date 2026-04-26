import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity("news")
export class News {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  title: string;

  @Column({ nullable: true })
  subtitle: string;

  @Column({ type: "text", nullable: true })
  content: string;

  @Column({ nullable: true })
  image: string;

  @Column({ nullable: true })
  sourceUrl: string;

  @Column({ nullable: true })
  source: string;

  @Column({ type: "timestamp", nullable: true })
  publishedAt: Date;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}