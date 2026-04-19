import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSrOrderId1715200000000 implements MigrationInterface {
  name = 'AddSrOrderId1715200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN sr_order_id VARCHAR(50) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN sr_order_id
    `);
  }
}