import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintOnOrderIdAndShippingRocketId1712000000007 implements MigrationInterface {
  name = 'AddUniqueConstraintOnOrderIdAndShippingRocketId1712000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add a unique constraint on (orderId, shippingRocketId) to prevent duplicate shipments
    // This ensures only one shipment can be created per order per ShipRocket ID
    await queryRunner.query(
      `ALTER TABLE \`shipments\` ADD UNIQUE INDEX \`UQ_shipments_orderId_shippingRocketId\` (\`orderId\`, \`shippingRocketId\`)`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint if we need to revert
    await queryRunner.query(
      `ALTER TABLE \`shipments\` DROP INDEX \`UQ_shipments_orderId_shippingRocketId\``
    );
  }
}
