import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateAdviceRequests1780000000000 implements MigrationInterface {
  name = "CreateAdviceRequests1780000000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS advice_requests (
        id INT AUTO_INCREMENT NOT NULL,
        doctorName VARCHAR(255) NOT NULL,
        clinicName VARCHAR(255) NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NULL,
        equipmentName VARCHAR(255) NOT NULL,
        equipmentCategory VARCHAR(100) NOT NULL,
        equipmentBrand VARCHAR(255) NULL,
        problemDescription TEXT NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        userId VARCHAR(36) NULL,
        adminNotes TEXT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_advice_status (status),
        INDEX idx_advice_category (equipmentCategory),
        INDEX idx_advice_created (createdAt)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS advice_requests`);
  }
}
