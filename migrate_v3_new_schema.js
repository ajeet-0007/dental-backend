const mysql = require('mysql2/promise');

const config = {
  host: process.env.MYSQL_DATABASE_HOST || 'mysql-273847d1-as1911018-cea6.f.aivencloud.com',
  port: parseInt(process.env.MYSQL_DATABASE_PORT) || 27873,
  user: process.env.MYSQL_DATABASE_USER || 'avnadmin',
  password: process.env.MYSQL_DATABASE_PASSWORD || 'AVNS_IGYST4u2H1WpZ0s7mf4',
  database: process.env.MYSQL_DATABASE_NAME || 'defaultdb',
  multipleStatements: true,
};

async function migrate() {
  const connection = await mysql.createConnection(config);
  console.log('Connected to database');

  try {
    console.log('\n=== Step 1: Create product_options table ===');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        productId INT NOT NULL,
        name VARCHAR(100) NOT NULL,
        position INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_product_options_product (productId),
        INDEX idx_product_options_position (productId, position)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created product_options table');

    console.log('\n=== Step 2: Create product_option_values table ===');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS product_option_values (
        id INT AUTO_INCREMENT PRIMARY KEY,
        optionId INT NOT NULL,
        value VARCHAR(100) NOT NULL,
        position INT DEFAULT 0,
        hexCode VARCHAR(7) DEFAULT NULL,
        swatchUrl VARCHAR(1000) DEFAULT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_option_values_option (optionId),
        INDEX idx_option_values_position (optionId, position),
        FOREIGN KEY (optionId) REFERENCES product_options(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created product_option_values table');

    console.log('\n=== Step 3: Create variant_options junction table ===');
    await connection.query(`
      CREATE TABLE IF NOT EXISTS variant_options (
        id INT AUTO_INCREMENT PRIMARY KEY,
        variantId VARCHAR(36) NOT NULL,
        optionId INT NOT NULL,
        optionValueId INT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_variant_option (variantId, optionId),
        INDEX idx_variant_options_variant (variantId),
        INDEX idx_variant_options_value (optionValueId),
        FOREIGN KEY (optionId) REFERENCES product_options(id) ON DELETE CASCADE,
        FOREIGN KEY (optionValueId) REFERENCES product_option_values(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('Created variant_options table');

    console.log('\n=== Step 4: Add variant_key column to product_variants ===');
    try {
      await connection.query(`
        ALTER TABLE product_variants 
        ADD COLUMN variantKey VARCHAR(500) DEFAULT NULL AFTER flavor
      `);
      console.log('Added variantKey column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('variantKey column already exists');
      } else {
        throw err;
      }
    }

    console.log('\n=== Step 5: Migrate attribute definitions to product_options ===');
    
    // Get distinct products that have attribute definitions
    const [existingDefs] = await connection.query(`
      SELECT DISTINCT productId FROM product_attribute_definitions
    `);
    
    console.log(`Found ${existingDefs.length} products with attribute definitions`);
    
    for (const { productId } of existingDefs) {
      // Get all definitions for this product
      const [defs] = await connection.query(`
        SELECT * FROM product_attribute_definitions WHERE productId = ?
      `, [productId]);
      
      // Get max position
      const [maxPosResult] = await connection.query(`
        SELECT COALESCE(MAX(position), -1) as maxPos FROM product_options WHERE productId = ?
      `, [productId]);
      let position = (maxPosResult[0]?.maxPos || 0) + 1;
      
      for (const def of defs) {
        // Insert into product_options
        const [result] = await connection.query(`
          INSERT INTO product_options (productId, name, position)
          VALUES (?, ?, ?)
        `, [productId, def.attributeLabel || def.attributeType, position]);
        
        const optionId = result.insertId;
        
        // Get distinct values from variant_attribute_values for this type
        const [values] = await connection.query(`
          SELECT DISTINCT value FROM variant_attribute_values 
          WHERE attributeType = ? AND variantId IN (
            SELECT id FROM product_variants WHERE productId = ?
          )
        `, [def.attributeType, productId]);
        
        // Also get values from old color/size/flavor columns if applicable
        const additionalValues = [];
        if (def.attributeType === 'color') {
          const [colors] = await connection.query(`
            SELECT DISTINCT color as value FROM product_variants 
            WHERE productId = ? AND color IS NOT NULL AND color != '' AND color != 'null'
          `, [productId]);
          additionalValues.push(...colors);
        }
        if (def.attributeType === 'size') {
          const [sizes] = await connection.query(`
            SELECT DISTINCT size as value FROM product_variants 
            WHERE productId = ? AND size IS NOT NULL AND size != '' AND size != 'null'
          `, [productId]);
          additionalValues.push(...sizes);
        }
        if (def.attributeType === 'flavor') {
          const [flavors] = await connection.query(`
            SELECT DISTINCT flavor as value FROM product_variants 
            WHERE productId = ? AND flavor IS NOT NULL AND flavor != '' AND flavor != 'null'
          `, [productId]);
          additionalValues.push(...flavors);
        }
        
        // Combine and dedupe values
        const allValues = [...values, ...additionalValues];
        const uniqueValues = [...new Set(allValues.map(v => v.value).filter(Boolean))];
        
        let valuePosition = 0;
        for (const val of uniqueValues) {
          await connection.query(`
            INSERT INTO product_option_values (optionId, value, position)
            VALUES (?, ?, ?)
          `, [optionId, val, valuePosition]);
          valuePosition++;
        }
        
        console.log(`  Migrated option: ${def.attributeType} for product ${productId} with ${uniqueValues.length} values`);
        position++;
      }
    }

    console.log('\n=== Step 6: Migrate variant attribute values to variant_options ===');
    
    // Get all variant attribute values one by one to avoid collation issues
    const [attrValues] = await connection.query(`
      SELECT vav.*, po.id as optionId, pov.id as optionValueId
      FROM variant_attribute_values vav
      JOIN product_options po ON po.productId = (
        SELECT productId FROM product_variants WHERE id = vav.variantId
      ) AND po.name = vav.attributeType COLLATE utf8mb4_unicode_ci
      JOIN product_option_values pov ON pov.optionId = po.id AND pov.value = vav.value COLLATE utf8mb4_unicode_ci
    `);
    
    console.log(`Found ${attrValues.length} attribute values to migrate`);
    
    let migratedCount = 0;
    for (const av of attrValues) {
      try {
        await connection.query(`
          INSERT INTO variant_options (variantId, optionId, optionValueId)
          VALUES (?, ?, ?)
        `, [av.variantId, av.optionId, av.optionValueId]);
        migratedCount++;
      } catch (err) {
        if (err.code !== 'ER_DUP_ENTRY') {
          console.log(`  Warning: Failed to migrate variant_option for variant ${av.variantId}: ${err.message}`);
        }
      }
    }
    console.log(`Migrated ${migratedCount} variant options`);

    console.log('\n=== Step 7: Compute and update variant_keys ===');
    
    const [variants] = await connection.query(`
      SELECT id, productId FROM product_variants WHERE variantKey IS NULL OR variantKey = ''
    `);
    
    for (const variant of variants) {
      const [options] = await connection.query(`
        SELECT pov.value
        FROM variant_options vo
        JOIN product_options po ON po.id = vo.optionId
        JOIN product_option_values pov ON pov.id = vo.optionValueId
        WHERE vo.variantId = ?
        ORDER BY po.position
      `, [variant.id]);
      
      if (options.length > 0) {
        const key = options.map(o => o.value).join('|');
        await connection.query(`
          UPDATE product_variants SET variantKey = ? WHERE id = ?
        `, [key, variant.id]);
      }
    }
    console.log(`Updated variant keys for ${variants.length} variants`);

    console.log('\n=== Step 8: Drop old tables (backup first) ===');
    // We'll keep the old tables for now in case we need to rollback
    // Uncomment these lines after verifying the migration:
    // await connection.query(`DROP TABLE IF EXISTS variant_attribute_values`);
    // await connection.query(`DROP TABLE IF EXISTS product_attribute_definitions`);
    console.log('Old tables preserved for rollback (drop manually after verification)');

    console.log('\n=== Migration Summary ===');
    console.log('New tables created: product_options, product_option_values, variant_options');
    console.log('variantKey column added to product_variants');
    console.log('Data migrated successfully');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await connection.end();
    console.log('Database connection closed');
  }
}

migrate()
  .then(() => {
    console.log('\nMigration completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
