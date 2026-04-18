import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateDefaultProductDimensions1715100000000 implements MigrationInterface {
  name = 'UpdateDefaultProductDimensions1715100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Set default weight (500g) for products with weight = 0
    await queryRunner.query(`
      UPDATE products 
      SET weight = 500 
      WHERE weight = 0 OR weight IS NULL
    `);

    // Set default dimensions (10x10x10cm) for products with length = 0
    await queryRunner.query(`
      UPDATE products 
      SET length = 10, breadth = 10, height = 10 
      WHERE length = 0 OR length IS NULL
    `);

    // Also update variants with weight = 0 using product weight
    await queryRunner.query(`
      UPDATE product_variants pv
      JOIN products p ON pv.productId = p.id
      SET pv.weight = p.weight
      WHERE pv.weight = 0 OR pv.weight IS NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // No rollback needed for default values
  }
}