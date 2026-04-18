import { MigrationInterface, QueryRunner } from 'typeorm';

export class FixShipmentSchemaIdToUUID1712000000005 implements MigrationInterface {
  name = 'FixShipmentSchemaIdToUUID1712000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // This migration consolidates the shipping rocket changes and converts shipments.id to UUID

    // First, record the shipping rocket migrations in the migrations table (they were already applied via synchronize)
    await queryRunner.query(`
      INSERT IGNORE INTO \`migrations\` (\`timestamp\`, \`name\`) VALUES
      ('1712000000000', 'AddShippingRocketFields1712000000000'),
      ('1712000000001', 'AddShippingFieldsToOrder1712000000001'),
      ('1712000000002', 'CreateReturnShipmentEntity1712000000002')
    `);

    // Now convert the shipments.id from INT to UUID
    // Step 1: Drop all dependent indexes and constraints (with try-catch for compatibility)
    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`UQ_shipments_trackingNumber\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_shippingRocketId\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_trackingNumber\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_status\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_orderId\``);
    } catch (e) {}

    // Step 2: Add a temporary UUID column
    await queryRunner.query(`ALTER TABLE \`shipments\` ADD COLUMN \`id_new\` VARCHAR(36) NOT NULL`);

    // Step 3: Generate UUIDs for existing rows
    await queryRunner.query(`UPDATE \`shipments\` SET \`id_new\` = UUID()`);

    // Step 4: Perform the column swap in one operation to satisfy sql_require_primary_key
    // Drop old primary key, drop old id column, rename id_new to id, and add as new primary key
    await queryRunner.query(`
      ALTER TABLE \`shipments\`
      DROP PRIMARY KEY,
      DROP COLUMN \`id\`,
      CHANGE COLUMN \`id_new\` \`id\` VARCHAR(36) NOT NULL,
      ADD PRIMARY KEY (\`id\`)
    `);

    // Step 5: Re-add all the indexes
    await queryRunner.query(`ALTER TABLE \`shipments\` ADD UNIQUE INDEX \`UQ_shipments_trackingNumber\` (\`trackingNumber\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_shipments_shippingRocketId\` ON \`shipments\` (\`shippingRocketId\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_shipments_trackingNumber\` ON \`shipments\` (\`trackingNumber\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_shipments_status\` ON \`shipments\` (\`status\`)`);
    await queryRunner.query(`CREATE INDEX \`IDX_shipments_orderId\` ON \`shipments\` (\`orderId\`)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert back to INT AUTO_INCREMENT (destructive - loses UUID data)
    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`UQ_shipments_trackingNumber\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_shippingRocketId\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_trackingNumber\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_status\``);
    } catch (e) {}

    try {
      await queryRunner.query(`ALTER TABLE \`shipments\` DROP INDEX \`IDX_shipments_orderId\``);
    } catch (e) {}

    // Add back INT AUTO_INCREMENT id column
    await queryRunner.query(`
      ALTER TABLE \`shipments\`
      DROP PRIMARY KEY,
      DROP COLUMN \`id\`,
      ADD COLUMN \`id\` INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
      ADD UNIQUE INDEX \`UQ_shipments_trackingNumber\` (\`trackingNumber\`),
      ADD INDEX \`IDX_shipments_orderId\` (\`orderId\`)
    `);
  }
}
