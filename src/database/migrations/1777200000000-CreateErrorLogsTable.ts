import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateErrorLogsTable1777200000000 implements MigrationInterface {
  name = 'CreateErrorLogsTable1777200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS error_logs (
        id varchar(36) NOT NULL,
        level enum('debug', 'info', 'warn', 'error', 'fatal') NOT NULL DEFAULT 'error',
        source enum('backend', 'frontend') NOT NULL DEFAULT 'backend',
        message text NOT NULL,
        stackTrace longtext NULL,
        context text NULL,
        module varchar(100) NULL,
        userId varchar(36) NULL,
        correlationId varchar(100) NULL,
        url varchar(500) NULL,
        method varchar(10) NULL,
        statusCode int NULL,
        ip varchar(45) NULL,
        userAgent varchar(500) NULL,
        tags text NULL,
        environment varchar(20) NOT NULL DEFAULT 'development',
        appVersion varchar(20) NULL,
        resolved tinyint NOT NULL DEFAULT 0,
        resolvedBy varchar(100) NULL,
        resolvedAt datetime NULL,
        resolvedNote text NULL,
        occurrenceCount int NOT NULL DEFAULT 1,
        lastOccurrenceAt datetime NULL,
        createdAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
        updatedAt datetime(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
        PRIMARY KEY (id),
        INDEX idx_logs_module (module),
        INDEX idx_logs_user (userId),
        INDEX idx_logs_correlation (correlationId),
        INDEX idx_logs_resolved (resolved),
        INDEX idx_logs_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS error_logs`);
  }
}
