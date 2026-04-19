import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMissingShipmentColumns1715300000000 implements MigrationInterface {
  name = 'AddMissingShipmentColumns1715300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Only add columns that don't exist
    try { await queryRunner.query(`ALTER TABLE shipments ADD COLUMN manifestUrl VARCHAR(500) NULL`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments ADD COLUMN invoiceUrl VARCHAR(500) NULL`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments ADD COLUMN lastWebhookEvent VARCHAR(100) NULL`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments ADD COLUMN lastWebhookAt DATETIME NULL`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments ADD COLUMN ndrReason VARCHAR(500) NULL`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments ADD COLUMN ndrRemarks VARCHAR(1000) NULL`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments ADD COLUMN ndrRetryCount INT DEFAULT 0`); } catch {}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN manifestUrl`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN invoiceUrl`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN lastWebhookEvent`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN lastWebhookAt`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN ndrReason`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN ndrRemarks`); } catch {}
    try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN ndrRetryCount`); } catch {}
  }
}