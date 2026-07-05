import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUniqueConstraintShipmentOrderRocket1712000000007 implements MigrationInterface {
  name = 'AddUniqueConstraintShipmentOrderRocket1712000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // First, identify and remove duplicate shipments, keeping only the earliest one per (orderId, shippingRocketId)
    
    // Get all duplicate shipments
    const duplicates = await queryRunner.query(`
      SELECT orderId, shippingRocketId, COUNT(*) as count, MIN(id) as keep_id
      FROM shipments
      WHERE shippingRocketId IS NOT NULL AND shippingRocketId != ''
      GROUP BY orderId, shippingRocketId
      HAVING count > 1
    `);


    // For each duplicate group, delete all but the first (earliest created)
    for (const dup of duplicates) {
      const toDelete = await queryRunner.query(`
        SELECT id FROM shipments
        WHERE orderId = ? AND shippingRocketId = ? AND id != ?
        ORDER BY createdAt ASC
      `, [dup.orderId, dup.shippingRocketId, dup.keep_id]);

      if (toDelete.length > 0) {
        const deleteIds = toDelete.map((d: any) => d.id);
        await queryRunner.query(
          `DELETE FROM shipments WHERE id IN (${deleteIds.map(() => '?').join(',')})`,
          deleteIds
        );
      }
    }

    // Now add the unique constraint to prevent future duplicates
    await queryRunner.query(`
      ALTER TABLE \`shipments\`
      ADD UNIQUE INDEX \`UQ_shipments_orderId_shippingRocketId\` 
      (\`orderId\`, \`shippingRocketId\`)
    `);

  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the unique constraint
    try {
      await queryRunner.query(`
        ALTER TABLE \`shipments\`
        DROP INDEX \`UQ_shipments_orderId_shippingRocketId\`
      `);
    } catch (e) {
      // Index might not exist
    }
  }
}
