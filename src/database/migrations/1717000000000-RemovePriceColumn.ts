import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemovePriceColumn1717000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products DROP COLUMN price`);
    await queryRunner.query(`ALTER TABLE product_variants DROP COLUMN price`);
    await queryRunner.query(`ALTER TABLE order_items CHANGE price unitPrice DECIMAL(10,2) NOT NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE products ADD COLUMN price INT NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE product_variants ADD COLUMN price INT NOT NULL DEFAULT 0`);
    await queryRunner.query(`ALTER TABLE order_items CHANGE unitPrice price DECIMAL(10,2) NOT NULL`);
  }
}
