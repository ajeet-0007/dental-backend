import { Injectable, Logger, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, Between, Brackets } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Log, LogLevel, LogSource } from '../../database/entities/log.entity';
import { CircuitBreaker, WriteState } from './utils/circuit-breaker';
import { redactContext, redactErrorMessage, redactStackTrace } from './utils/pii-redactor';

interface LogContext {
  source?: LogSource;
  module?: string;
  userId?: string;
  correlationId?: string;
  url?: string;
  method?: string;
  statusCode?: number;
  ip?: string;
  userAgent?: string;
  tags?: string[];
  stackTrace?: string;
  context?: Record<string, any>;
}

interface LogQuery {
  page?: number;
  limit?: number;
  level?: LogLevel;
  source?: LogSource;
  module?: string;
  userId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  resolved?: boolean;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface LogStats {
  total: number;
  byLevel: Record<string, number>;
  bySource: Record<string, number>;
  byModule: Record<string, number>;
  byDate: Record<string, number>;
}

@Injectable()
export class LogService {
  private readonly logger = new Logger(LogService.name);
  private readonly circuitBreaker: CircuitBreaker;
  private readonly environment: string;
  private readonly appVersion: string;
  private readonly logLevel: number;
  private readonly retentionDays: number;
  private writeQueue: { level: LogLevel; message: string; log: Partial<Log> }[] = [];
  private flushTimer: ReturnType<typeof setInterval> | null = null;
  private readonly flushInterval = 2000;
  private readonly maxBatchSize = 50;

  private readonly levelPriority: Record<LogLevel, number> = {
    [LogLevel.DEBUG]: 0,
    [LogLevel.INFO]: 1,
    [LogLevel.WARN]: 2,
    [LogLevel.ERROR]: 3,
    [LogLevel.FATAL]: 4,
  };

  constructor(
    @InjectRepository(Log)
    private readonly logRepository: Repository<Log>,
    private readonly configService: ConfigService,
  ) {
    this.environment = configService.get('NODE_ENV', 'development');
    this.appVersion = configService.get('npm_package_version', '1.0.0');
    this.retentionDays = configService.get('LOG_RETENTION_DAYS', 90);

    const configuredLevel = configService.get('LOG_LEVEL', this.environment === 'production' ? 'error' : 'debug');
    this.logLevel = this.levelPriority[configuredLevel as LogLevel] ?? (this.environment === 'production' ? 3 : 0);

    this.circuitBreaker = new CircuitBreaker((state) => {
      this.logger.warn(`Log circuit breaker state changed to: ${state}`);
    });

    this.flushTimer = setInterval(() => this.flushQueue(), this.flushInterval);

    if (typeof process !== 'undefined' && process.on) {
      process.on('beforeExit', () => this.flushQueueSync());
      process.on('SIGTERM', () => this.flushQueueSync());
      process.on('SIGINT', () => this.flushQueueSync());
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levelPriority[level] >= this.logLevel;
  }

  private getDefaultContext(): Partial<Log> {
    return {
      environment: this.environment,
      appVersion: this.appVersion,
    };
  }

  private enqueueWrite(level: LogLevel, message: string, logData: Partial<Log>): void {
    this.writeQueue.push({ level, message, log: logData });
    if (this.writeQueue.length >= this.maxBatchSize) {
      this.flushQueue();
    }
  }

  private async flushQueue(): Promise<void> {
    if (this.writeQueue.length === 0) return;

    const batch = this.writeQueue.splice(0, this.maxBatchSize);
    try {
      await this.batchWrite(batch);
    } catch (err) {
      this.writeQueue.unshift(...batch);
      if (this.writeQueue.length > this.maxBatchSize * 2) {
        const overflow = this.writeQueue.splice(this.maxBatchSize);
        for (const item of overflow) {
          this.circuitBreaker.enqueue({
            timestamp: new Date().toISOString(),
            level: item.level,
            message: item.message,
            data: JSON.stringify(item.log),
          });
        }
      }
    }
  }

  private flushQueueSync(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.writeQueue.length === 0) return;
    const batch = this.writeQueue.splice(0);
    this.batchWrite(batch).catch((err) => {
      this.circuitBreaker.writeToConsole('error', 'Failed to flush log queue on shutdown', err.message);
    });
  }

  private async batchWrite(
    batch: { level: LogLevel; message: string; log: Partial<Log> }[],
  ): Promise<void> {
    if (!this.circuitBreaker.canWrite()) {
      for (const item of batch) {
        this.circuitBreaker.writeToConsole(item.level, item.message, JSON.stringify(item.log));
      }
      return;
    }

    const deduplicated = this.deduplicateBatch(batch);

    try {
      const entities = deduplicated.map((item) =>
        this.logRepository.create({
          ...item.log,
          level: item.level,
          message: item.message,
        }),
      );
      await this.logRepository.save(entities, { chunk: 50 });
      this.circuitBreaker.recordSuccess();

      const queued = this.circuitBreaker.drainQueue();
      if (queued.length > 0) {
        const recovered = queued.map((q) => {
          const data = q.data ? JSON.parse(q.data) : {};
          return {
            level: q.level as LogLevel,
            message: q.message,
            log: this.logRepository.create({
              ...data,
              level: q.level as LogLevel,
              message: q.message,
            }),
          };
        });
        await this.logRepository.save(recovered, { chunk: 50 });
      }
    } catch (err) {
      this.circuitBreaker.recordFailure();
      for (const item of batch) {
        this.circuitBreaker.writeToFile(item.level, item.message, JSON.stringify(item.log));
      }
    }
  }

  private deduplicateBatch(
    batch: { level: LogLevel; message: string; log: Partial<Log> }[],
  ): { level: LogLevel; message: string; log: Partial<Log> }[] {
    const seen = new Map<string, { level: LogLevel; message: string; log: Partial<Log>; count: number }>();
    for (const item of batch) {
      const key = `${item.level}:${item.message}:${item.log.module || ''}`;
      if (seen.has(key)) {
        const existing = seen.get(key)!;
        existing.count++;
        existing.log.occurrenceCount = existing.count;
        existing.log.lastOccurrenceAt = new Date();
      } else {
        seen.set(key, { ...item, count: 1 });
        item.log.occurrenceCount = 1;
        item.log.lastOccurrenceAt = new Date();
      }
    }
    return Array.from(seen.values()).map(({ level, message, log }) => ({ level, message, log }));
  }

  private buildLogEntry(level: LogLevel, message: string, ctx?: LogContext): { level: LogLevel; message: string; log: Partial<Log> } {
    const log: Partial<Log> = {
      ...this.getDefaultContext(),
      source: ctx?.source || LogSource.BACKEND,
      module: ctx?.module,
      userId: ctx?.userId,
      correlationId: ctx?.correlationId,
      url: ctx?.url,
      method: ctx?.method,
      statusCode: ctx?.statusCode,
      ip: ctx?.ip,
      userAgent: ctx?.userAgent,
      tags: ctx?.tags,
    };

    if (ctx?.stackTrace) {
      log.stackTrace = redactStackTrace(ctx.stackTrace);
    }

    if (ctx?.context) {
      log.context = redactContext(ctx.context);
    }

    const redactedMessage = redactErrorMessage(message);

    return { level, message: redactedMessage, log };
  }

  debug(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    this.enqueueWrite(LogLevel.DEBUG, message, this.buildLogEntry(LogLevel.DEBUG, message, ctx).log);
  }

  info(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    this.enqueueWrite(LogLevel.INFO, message, this.buildLogEntry(LogLevel.INFO, message, ctx).log);
  }

  warn(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    this.enqueueWrite(LogLevel.WARN, message, this.buildLogEntry(LogLevel.WARN, message, ctx).log);
  }

  error(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    this.enqueueWrite(LogLevel.ERROR, message, this.buildLogEntry(LogLevel.ERROR, message, ctx).log);
  }

  fatal(message: string, ctx?: LogContext): void {
    if (!this.shouldLog(LogLevel.FATAL)) return;
    this.enqueueWrite(LogLevel.FATAL, message, this.buildLogEntry(LogLevel.FATAL, message, ctx).log);
  }

  logFromClient(dto: { level: LogLevel; message: string; stackTrace?: string; context?: Record<string, any>; url?: string; userId?: string; userAgent?: string; tags?: string[] }): void {
    const ctx: LogContext = {
      source: LogSource.FRONTEND,
      stackTrace: dto.stackTrace,
      context: dto.context,
      url: dto.url,
      userId: dto.userId,
      userAgent: dto.userAgent,
      tags: dto.tags,
      module: 'frontend',
    };
    this.enqueueWrite(dto.level as LogLevel, dto.message, this.buildLogEntry(dto.level as LogLevel, dto.message, ctx).log);
  }

  async getLogs(query: LogQuery): Promise<{ data: Log[]; total: number; page: number; limit: number; totalPages: number }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 50, 200);
    const skip = (page - 1) * limit;
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'DESC';

    const qb = this.logRepository.createQueryBuilder('log');

    if (query.level) {
      qb.andWhere('log.level = :level', { level: query.level });
    }
    if (query.source) {
      qb.andWhere('log.source = :source', { source: query.source });
    }
    if (query.module) {
      qb.andWhere('log.module = :module', { module: query.module });
    }
    if (query.userId) {
      qb.andWhere('log.userId = :userId', { userId: query.userId });
    }
    if (query.resolved !== undefined) {
      qb.andWhere('log.resolved = :resolved', { resolved: query.resolved });
    }
    if (query.search) {
      qb.andWhere(
        new Brackets((sub) => {
          sub.where('log.message LIKE :search', { search: `%${query.search}%` })
             .orWhere('log.module LIKE :search', { search: `%${query.search}%` })
             .orWhere('log.stackTrace LIKE :search', { search: `%${query.search}%` });
        }),
      );
    }
    if (query.startDate) {
      qb.andWhere('log.createdAt >= :startDate', { startDate: new Date(query.startDate) });
    }
    if (query.endDate) {
      qb.andWhere('log.createdAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    const allowedSortFields = ['createdAt', 'level', 'source', 'module', 'occurrenceCount'];
    const actualSortBy = allowedSortFields.includes(sortBy) ? `log.${sortBy}` : 'log.createdAt';
    const actualSortOrder = sortOrder === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(actualSortBy, actualSortOrder);
    qb.addOrderBy('log.createdAt', 'DESC');

    qb.skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getLogById(id: string): Promise<Log | null> {
    return this.logRepository.findOne({ where: { id } });
  }

  async resolveLog(id: string, resolvedBy: string, note?: string): Promise<Log | null> {
    await this.logRepository.update(id, {
      resolved: true,
      resolvedBy,
      resolvedAt: new Date(),
      resolvedNote: note || null,
    });
    return this.getLogById(id);
  }

  async bulkResolve(ids: string[], resolvedBy: string): Promise<number> {
    const result = await this.logRepository.update(
      { id: ids as any },
      {
        resolved: true,
        resolvedBy,
        resolvedAt: new Date(),
      },
    );
    return result.affected || 0;
  }

  async getStats(query?: LogQuery): Promise<LogStats> {
    const params: any = {};
    const conditions: string[] = [];

    if (query?.startDate) {
      conditions.push('log.createdAt >= :startDate');
      params.startDate = new Date(query.startDate);
    }
    if (query?.endDate) {
      conditions.push('log.createdAt <= :endDate');
      params.endDate = new Date(query.endDate);
    }
    if (query?.source) {
      conditions.push('log.source = :source');
      params.source = query.source;
    }
    if (query?.resolved !== undefined) {
      conditions.push('log.resolved = :resolved');
      params.resolved = query.resolved;
    }

    const whereClause = conditions.length > 0 ? conditions.join(' AND ') : '1=1';

    const [total, byLevel, bySource, byModule, byDate] = await Promise.all([
      this.logRepository
        .createQueryBuilder('log')
        .where(whereClause, params)
        .getCount(),
      this.logRepository
        .createQueryBuilder('log')
        .select('log.level', 'level')
        .addSelect('COUNT(*)', 'count')
        .where(whereClause, params)
        .groupBy('log.level')
        .getRawMany(),
      this.logRepository
        .createQueryBuilder('log')
        .select('log.source', 'source')
        .addSelect('COUNT(*)', 'count')
        .where(whereClause, params)
        .groupBy('log.source')
        .getRawMany(),
      this.logRepository
        .createQueryBuilder('log')
        .select('log.module', 'module')
        .addSelect('COUNT(*)', 'count')
        .where(whereClause, params)
        .andWhere('log.module IS NOT NULL')
        .groupBy('log.module')
        .orderBy('count', 'DESC')
        .limit(20)
        .getRawMany(),
      this.logRepository
        .createQueryBuilder('log')
        .select('DATE(log.createdAt)', 'date')
        .addSelect('COUNT(*)', 'count')
        .where(whereClause, params)
        .groupBy('DATE(log.createdAt)')
        .orderBy('date', 'DESC')
        .limit(31)
        .getRawMany(),
    ]);

    const levelMap: Record<string, number> = {};
    for (const row of byLevel) {
      levelMap[row.level] = parseInt(row.count, 10);
    }

    const sourceMap: Record<string, number> = {};
    for (const row of bySource) {
      sourceMap[row.source] = parseInt(row.count, 10);
    }

    const moduleMap: Record<string, number> = {};
    for (const row of byModule) {
      moduleMap[row.module] = parseInt(row.count, 10);
    }

    const dateMap: Record<string, number> = {};
    for (const row of byDate) {
      const dateKey = row.date instanceof Date ? row.date.toISOString().split('T')[0] : String(row.date);
      dateMap[dateKey] = parseInt(row.count, 10);
    }

    return {
      total,
      byLevel: levelMap,
      bySource: sourceMap,
      byModule: moduleMap,
      byDate: dateMap,
    };
  }

  async purgeOldLogs(): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - this.retentionDays);

    const result = await this.logRepository.delete({
      createdAt: LessThan(cutoff),
      resolved: true,
    });

    return result.affected || 0;
  }

  async exportLogs(query: LogQuery): Promise<Log[]> {
    const page = 1;
    const limit = 10000;
    const result = await this.getLogs({ ...query, page, limit });
    return result.data;
  }

  onModuleDestroy(): void {
    this.flushQueueSync();
    this.circuitBreaker.destroy();
  }
}
