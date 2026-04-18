import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddProductWeightDimensions1715000000000 implements MigrationInterface {
  name = 'AddProductWeightDimensions1715000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products 
      ADD COLUMN weight INT DEFAULT 0,
      ADD COLUMN weightUnit VARCHAR(10) DEFAULT 'g',
      ADD COLUMN length INT DEFAULT 0,
      ADD COLUMN breadth INT DEFAULT 0,
      ADD COLUMN height INT DEFAULT 0,
      ADD COLUMN dimensionUnit VARCHAR(10) DEFAULT 'cm'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE products 
      DROP COLUMN weight,
      DROP COLUMN weightUnit,
      DROP COLUMN length,
      DROP COLUMN breadth,
      DROP COLUMN height,
      DROP COLUMN dimensionUnit
    `);
  }
}