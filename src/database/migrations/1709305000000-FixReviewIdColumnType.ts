import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixReviewIdColumnType1709305000000 implements MigrationInterface {
  name = 'FixReviewIdColumnType1709305000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check current id column type
    const columns = await queryRunner.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'defaultdb' 
      AND TABLE_NAME = 'reviews' 
      AND COLUMN_NAME = 'id'
    `);
    
    
    // Change from INT to VARCHAR(36) for UUID
    await queryRunner.query(`
      ALTER TABLE \`reviews\` 
      MODIFY \`id\` VARCHAR(36) NOT NULL
    `);
    
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert to INT (not recommended but for rollback)
    await queryRunner.query(`
      ALTER TABLE \`reviews\` 
      MODIFY \`id\` INT NOT NULL AUTO_INCREMENT
    `);
  }
}