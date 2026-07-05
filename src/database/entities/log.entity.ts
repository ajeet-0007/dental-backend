import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

export enum LogSource {
  BACKEND = 'backend',
  FRONTEND = 'frontend',
}

@Entity('error_logs')
export class Log {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'enum', enum: LogLevel, default: LogLevel.ERROR })
  level: LogLevel;

  @Column({ type: 'enum', enum: LogSource, default: LogSource.BACKEND })
  source: LogSource;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'longtext', nullable: true })
  stackTrace: string | null;

  @Column({ type: 'simple-json', nullable: true })
  context: Record<string, any> | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('idx_logs_module')
  module: string | null;

  @Column({ name: 'userId', type: 'varchar', length: 36, nullable: true })
  @Index('idx_logs_user')
  userId: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  @Index('idx_logs_correlation')
  correlationId: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  url: string | null;

  @Column({ type: 'varchar', length: 10, nullable: true })
  method: string | null;

  @Column({ type: 'int', nullable: true })
  statusCode: number | null;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  userAgent: string | null;

  @Column({ type: 'simple-json', nullable: true })
  tags: string[] | null;

  @Column({ type: 'varchar', length: 20, default: 'development' })
  environment: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  appVersion: string | null;

  @Column({ default: false })
  @Index('idx_logs_resolved')
  resolved: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  resolvedBy: string | null;

  @Column({ type: 'datetime', nullable: true })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true })
  resolvedNote: string | null;

  @Column({ type: 'int', default: 1 })
  occurrenceCount: number;

  @Column({ type: 'datetime', nullable: true })
  lastOccurrenceAt: Date | null;

  @CreateDateColumn({ type: 'datetime', precision: 3 })
  @Index('idx_logs_created')
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime', precision: 3 })
  updatedAt: Date;
}
