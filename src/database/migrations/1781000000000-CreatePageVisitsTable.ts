import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreatePageVisitsTable1781000000000 implements MigrationInterface {
  name = 'CreatePageVisitsTable1781000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS \`page_visits\` (
        \`id\` char(36) NOT NULL,
        \`visitorId\` char(36) NOT NULL,
        \`userId\` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NULL,
        \`path\` varchar(500) NOT NULL,
        \`pageTitle\` varchar(255) NULL,
        \`referrer\` varchar(500) NULL,
        \`ip\` varchar(45) NULL,
        \`userAgent\` varchar(500) NULL,
        \`deviceType\` enum('desktop','mobile','tablet') NOT NULL DEFAULT 'desktop',
        \`createdAt\` datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (\`id\`),
        CONSTRAINT \`fk_page_visits_user\` FOREIGN KEY (\`userId\`)
          REFERENCES \`users\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    await queryRunner.query(
      'CREATE INDEX `idx_page_visits_visitor` ON `page_visits` (`visitorId`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_page_visits_user` ON `page_visits` (`userId`)',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_page_visits_path` ON `page_visits` (`path`(191))',
    );
    await queryRunner.query(
      'CREATE INDEX `idx_page_visits_created` ON `page_visits` (`createdAt`)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `page_visits`');
  }
}
