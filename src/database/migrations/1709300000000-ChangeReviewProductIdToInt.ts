import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChangeReviewProductIdToInt1709300000000 implements MigrationInterface {
  name = 'ChangeReviewProductIdToInt1709300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check current column type
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME = 'reviews' 
      AND COLUMN_NAME = 'productId'
    `);
    
    
    // Change from varchar to int
    await queryRunner.query(`
      ALTER TABLE \`reviews\` 
      MODIFY \`productId\` int NOT NULL
    `);
    
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to varchar
    await queryRunner.query(`
      ALTER TABLE \`reviews\` 
      MODIFY \`productId\` varchar(36) NOT NULL
    `);
  }
}