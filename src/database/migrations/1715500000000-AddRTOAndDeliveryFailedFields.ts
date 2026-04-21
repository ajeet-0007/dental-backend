import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddRTOAndDeliveryFailedFields1715500000000 implements MigrationInterface {
  name = 'AddRTOAndDeliveryFailedFields1715500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'isRTO',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'deliveryFailed',
        type: 'boolean',
        default: false,
      }),
    );

    await queryRunner.addColumn(
      'orders',
      new TableColumn({
        name: 'deliveryFailedReason',
        type: 'text',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('orders', 'deliveryFailedReason');
    await queryRunner.dropColumn('orders', 'deliveryFailed');
    await queryRunner.dropColumn('orders', 'isRTO');
  }
}
