import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddReviewFields1709200000000 implements MigrationInterface {
  name = 'AddReviewFields1709200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Check and add orderId column if it doesn't exist
    const orderIdExists = await queryRunner.hasColumn('reviews', 'orderId');
    if (!orderIdExists) {
      await queryRunner.addColumn(
        'reviews',
        new TableColumn({
          name: 'orderId',
          type: 'varchar',
          length: '36',
          isNullable: true,
        }),
      );
    }

    // Check and add images column if it doesn't exist
    const imagesExists = await queryRunner.hasColumn('reviews', 'images');
    if (!imagesExists) {
      await queryRunner.addColumn(
        'reviews',
        new TableColumn({
          name: 'images',
          type: 'json',
          isNullable: true,
        }),
      );
    }

    // Check and add helpfulCount column if it doesn't exist
    const helpfulCountExists = await queryRunner.hasColumn('reviews', 'helpfulCount');
    if (!helpfulCountExists) {
      await queryRunner.addColumn(
        'reviews',
        new TableColumn({
          name: 'helpfulCount',
          type: 'int',
          default: 0,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only drop if exists
    const helpfulCountExists = await queryRunner.hasColumn('reviews', 'helpfulCount');
    if (helpfulCountExists) {
      await queryRunner.dropColumn('reviews', 'helpfulCount');
    }
    
    const imagesExists = await queryRunner.hasColumn('reviews', 'images');
    if (imagesExists) {
      await queryRunner.dropColumn('reviews', 'images');
    }
    
    const orderIdExists = await queryRunner.hasColumn('reviews', 'orderId');
    if (orderIdExists) {
      await queryRunner.dropColumn('reviews', 'orderId');
    }
  }
}