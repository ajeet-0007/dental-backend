import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
}

@Entity('page_visits')
@Index('idx_page_visits_visitor', ['visitorId'])
@Index('idx_page_visits_user', ['userId'])
@Index('idx_page_visits_path', ['path'])
@Index('idx_page_visits_created', ['createdAt'])
export class PageVisit {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'visitorId', type: 'char', length: 36 })
  visitorId: string;

  @Column({ name: 'userId', type: 'char', length: 36, nullable: true })
  userId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'userId' })
  user: User | null;

  @Column({ type: 'varchar', length: 500 })
  path: string;

  @Column({ name: 'pageTitle', type: 'varchar', length: 255, nullable: true })
  pageTitle: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  referrer: string | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({
    name: 'deviceType',
    type: 'enum',
    enum: DeviceType,
    default: DeviceType.DESKTOP,
  })
  deviceType: DeviceType;

  @CreateDateColumn({ name: 'createdAt' })
  createdAt: Date;
}
