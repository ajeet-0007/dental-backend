const mysql = require('mysql2/promise');

const config = {
  host: process.env.MYSQL_DATABASE_HOST || 'mysql-273847d1-as1911018-cea6.f.aivencloud.com',
  port: parseInt(process.env.MYSQL_DATABASE_PORT) || 27873,
  user: process.env.MYSQL_DATABASE_USER || 'avnadmin',
  password: process.env.MYSQL_DATABASE_PASSWORD || 'AVNS_IGYST4u2H1WpZ0s7mf4',
  database: process.env.MYSQL_DATABASE_NAME || 'defaultdb',
  connectTimeout: 30000,
};

async function migrateVariants() {
  const connection = await mysql.createConnection(config);
  console.log('Connected to database');

  try {
    // Get all variants with color, size, or flavor
    const [variants] = await connection.query(`
      SELECT id, productId, color, size, flavor 
      FROM product_variants 
      WHERE (color IS NOT NULL AND color != '' AND color != 'null')
         OR (size IS NOT NULL AND size != '' AND size != 'null')
         OR (flavor IS NOT NULL AND flavor != '' AND flavor != 'null')
    `);

    console.log(`Found ${variants.length} variants to migrate`);

    let migratedCount = 0;
    let skippedCount = 0;
    const processedProducts = new Set();

    for (const variant of variants) {
      const [existingValues] = await connection.query(`
        SELECT COUNT(*) as count FROM variant_attribute_values WHERE variantId = ?
      `, [variant.id]);

      if (existingValues[0].count > 0) {
        console.log(`Variant ${variant.id} already has attribute values, skipping`);
        skippedCount++;
        continue;
      }

      const inserts = [];

      if (variant.color && variant.color !== '' && variant.color !== 'null') {
        inserts.push(['color', variant.color]);
      }

      if (variant.size && variant.size !== '' && variant.size !== 'null') {
        inserts.push(['size', variant.size]);
      }

      if (variant.flavor && variant.flavor !== '' && variant.flavor !== 'null') {
        inserts.push(['flavor', variant.flavor]);
      }

      if (inserts.length > 0) {
        for (const [attrType, value] of inserts) {
          await connection.query(`
            INSERT INTO variant_attribute_values (variantId, attributeType, value, createdAt)
            VALUES (?, ?, ?, NOW())
          `, [variant.id, attrType, value]);
        }

        // Update product's hasVariants flag
        await connection.query(`
          UPDATE products SET hasVariants = 1 WHERE id = ?
        `, [variant.productId]);

        processedProducts.add(variant.productId);
        migratedCount++;
        console.log(`Migrated variant ${variant.id}: color=${variant.color}, size=${variant.size}, flavor=${variant.flavor}`);
      }
    }

    // Also update products that have variants but no attribute values in the old columns
    const [productsWithVariants] = await connection.query(`
      SELECT DISTINCT productId FROM product_variants
    `);

    for (const row of productsWithVariants) {
      await connection.query(`
        UPDATE products SET hasVariants = 1 WHERE id = ?
      `, [row.productId]);
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total variants processed: ${variants.length}`);
    console.log(`Newly migrated: ${migratedCount}`);
    console.log(`Skipped (already migrated): ${skippedCount}`);
    console.log(`Products updated with hasVariants=true: ${processedProducts.size + productsWithVariants.length}`);

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

migrateVariants()
  .then(() => {
    console.log('Migration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
