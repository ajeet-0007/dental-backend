import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddShippingWebhookFields1715300000000 implements MigrationInterface {
  name = 'AddShippingWebhookFields1715300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add courier charges and COD collected to shipments
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN courier_charges DECIMAL(10,2) NULL,
      ADD COLUMN cod_collected_amount DECIMAL(10,2) NULL
    `);

    // Add manifest and invoice URLs
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN manifest_url VARCHAR(500) NULL,
      ADD COLUMN invoice_url VARCHAR(500) NULL
    `);

    // Add webhook timestamps
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN pickup_scheduled_at DATETIME NULL,
      ADD COLUMN picked_up_at DATETIME NULL,
      ADD COLUMN shipped_at DATETIME NULL,
      ADD COLUMN out_for_delivery_at DATETIME NULL,
      ADD COLUMN delivery_attempt_at DATETIME NULL,
      ADD COLUMN undelivered_at DATETIME NULL,
      ADD COLUMN delivered_at DATETIME NULL,
      ADD COLUMN estimated_delivery_date DATETIME NULL
    `);

    // Add NDR tracking fields
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN ndr_reason TEXT NULL,
      ADD COLUMN ndr_remarks TEXT NULL,
      ADD COLUMN ndr_retry_count INT DEFAULT 0
    `);

    // Add RTO tracking fields
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN rto_initiated_at DATETIME NULL,
      ADD COLUMN rto_delivered_at DATETIME NULL
    `);

    // Add return shipment tracking
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN return_awb_number VARCHAR(50) NULL,
      ADD COLUMN return_tracking_number VARCHAR(50) NULL,
      ADD COLUMN is_return_initiated BOOLEAN DEFAULT FALSE
    `);

    // Add webhook metadata
    await queryRunner.query(`
      ALTER TABLE shipments 
      ADD COLUMN last_webhook_event VARCHAR(100) NULL,
      ADD COLUMN last_webhook_at DATETIME NULL
    `);

    // Add auto-sync fields to orders
    await queryRunner.query(`
      ALTER TABLE orders 
      ADD COLUMN auto_shipping_status VARCHAR(50) NULL,
      ADD COLUMN auto_shipping_at DATETIME NULL
    `);

    // Create shipment tracking history table
    await queryRunner.query(`
      CREATE TABLE shipment_tracking_history (
        id VARCHAR(36) PRIMARY KEY,
        shipment_id VARCHAR(36) NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        status VARCHAR(50) NOT NULL,
        location VARCHAR(255) NULL,
        remarks TEXT NULL,
        courier_name VARCHAR(100) NULL,
        awb_number VARCHAR(50) NULL,
        tracking_number VARCHAR(50) NULL,
        courier_charges DECIMAL(10,2) NULL,
        received_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (shipment_id) REFERENCES shipments(id) ON DELETE CASCADE
      )
    `);

    // Create index for faster queries
    await queryRunner.query(`
      CREATE INDEX idx_tracking_history_shipment_id ON shipment_tracking_history(shipment_id)
    `);

    await queryRunner.query(`
      CREATE INDEX idx_tracking_history_created_at ON shipment_tracking_history(created_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tracking history table
    await queryRunner.query(`DROP TABLE IF EXISTS shipment_tracking_history`);

    // Remove order fields
    await queryRunner.query(`
      ALTER TABLE orders 
      DROP COLUMN auto_shipping_status,
      DROP COLUMN auto_shipping_at
    `);

    // Remove shipment webhook metadata
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN last_webhook_event,
      DROP COLUMN last_webhook_at
    `);

    // Remove return shipment tracking
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN return_awb_number,
      DROP COLUMN return_tracking_number,
      DROP COLUMN is_return_initiated
    `);

    // Remove RTO tracking fields
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN rto_initiated_at,
      DROP COLUMN rto_delivered_at
    `);

    // Remove NDR tracking fields
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN ndr_reason,
      DROP COLUMN ndr_remarks,
      DROP COLUMN ndr_retry_count
    `);

    // Remove webhook timestamps
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN pickup_scheduled_at,
      DROP COLUMN picked_up_at,
      DROP COLUMN shipped_at,
      DROP COLUMN out_for_delivery_at,
      DROP COLUMN delivery_attempt_at,
      DROP COLUMN undelivered_at,
      DROP COLUMN delivered_at,
      DROP COLUMN estimated_delivery_date
    `);

    // Remove manifest and invoice URLs
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN manifest_url,
      DROP COLUMN invoice_url
    `);

    // Remove courier charges and COD collected
    await queryRunner.query(`
      ALTER TABLE shipments 
      DROP COLUMN courier_charges,
      DROP COLUMN cod_collected_amount
    `);
  }
}