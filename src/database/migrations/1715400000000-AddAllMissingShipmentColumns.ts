import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAllMissingShipmentColumns1715400000000 implements MigrationInterface {
  name = 'AddAllMissingShipmentColumns1715400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      { name: 'courier_charges', type: 'DECIMAL(10,2)', nullable: true },
      { name: 'cod_collected_amount', type: 'DECIMAL(10,2)', nullable: true },
      { name: 'return_shipment_id', type: 'VARCHAR(50)', nullable: true },
      { name: 'return_awb_number', type: 'VARCHAR(50)', nullable: true },
      { name: 'return_tracking_number', type: 'VARCHAR(100)', nullable: true },
      { name: 'is_return_initiated', type: 'TINYINT(1)', default: 0 },
      { name: 'estimated_delivery_date', type: 'DATETIME', nullable: true },
      { name: 'rto_initiated_at', type: 'DATETIME', nullable: true },
      { name: 'rto_delivered_at', type: 'DATETIME', nullable: true },
      { name: 'last_webhook_event', type: 'VARCHAR(100)', nullable: true },
      { name: 'last_webhook_at', type: 'DATETIME', nullable: true },
    ];

    for (const col of columns) {
      try {
        const sql = `ALTER TABLE shipments ADD COLUMN ${col.name} ${col.type}${col.nullable ? ' NULL' : ''}${col.default !== undefined ? ` DEFAULT ${col.default}` : ''}`;
        await queryRunner.query(sql);
      } catch (e) {
        // Column might already exist
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      'courier_charges', 'cod_collected_amount', 'return_shipment_id',
      'return_awb_number', 'return_tracking_number', 'is_return_initiated',
      'estimated_delivery_date', 'rto_initiated_at', 'rto_delivered_at',
      'last_webhook_event', 'last_webhook_at'
    ];
    for (const col of columns) {
      try { await queryRunner.query(`ALTER TABLE shipments DROP COLUMN ${col}`); } catch {}
    }
  }
}