import { MigrationInterface, QueryRunner } from 'typeorm';

export class RemoveTrackingNumberUniqueConstraint1712000000006 implements MigrationInterface {
  name = 'RemoveTrackingNumberUniqueConstraint1712000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Drop the unique constraint on trackingNumber since it can be NULL/optional
    // and multiple shipments can have NULL tracking numbers at creation time
    await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`UQ_shipments_trackingNumber\``);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Re-add the unique constraint if we need to revert
    await queryRunner.query(`ALTER TABLE \`shipments\` ADD UNIQUE INDEX \`UQ_shipments_trackingNumber\` (\`trackingNumber\`)`);
  }
}
