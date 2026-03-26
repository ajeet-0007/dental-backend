const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'mysql-273847d1-as1911018-cea6.f.aivencloud.com',
    port: 27873,
    user: 'avnadmin',
    password: 'AVNS_IGYST4u2H1WpZ0s7mf4',
    database: 'defaultdb'
  });

  console.log('Starting Phase 1: Database Migration\n');
  console.log('='.repeat(50));

  try {
    // Step 1: Add hasVariants flag to products
    console.log('\n[1/5] Adding hasVariants column to products...');
    try {
      await connection.execute('ALTER TABLE products ADD COLUMN hasVariants BOOLEAN DEFAULT FALSE');
      console.log('  ✓ Added hasVariants column');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('  ✓ hasVariants column already exists');
      } else throw err;
    }

    // Step 2: Create product_attribute_definitions table
    console.log('\n[2/5] Creating product_attribute_definitions table...');
    try {
      await connection.execute(`
        CREATE TABLE product_attribute_definitions (
          id VARCHAR(36) PRIMARY KEY,
          productId INT NOT NULL,
          attributeType VARCHAR(50) NOT NULL,
          attributeLabel VARCHAR(100),
          isRequired BOOLEAN DEFAULT FALSE,
          isFilterable BOOLEAN DEFAULT TRUE,
          displayOrder INT DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY unique_product_attribute (productId, attributeType),
          INDEX idx_productId (productId)
        )
      `);
      console.log('  ✓ Created product_attribute_definitions table');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  ✓ product_attribute_definitions table already exists');
      } else throw err;
    }

    // Step 3: Create variant_attribute_values table
    console.log('\n[3/5] Creating variant_attribute_values table...');
    try {
      await connection.execute(`
        CREATE TABLE variant_attribute_values (
          id VARCHAR(36) PRIMARY KEY,
          variantId VARCHAR(36) NOT NULL,
          attributeType VARCHAR(50) NOT NULL,
          value VARCHAR(100) NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY unique_variant_attribute (variantId, attributeType),
          INDEX idx_variantId (variantId),
          INDEX idx_attributeType (attributeType)
        )
      `);
      console.log('  ✓ Created variant_attribute_values table');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  ✓ variant_attribute_values table already exists');
      } else throw err;
    }

    // Step 4: Create attribute_options table for predefined values
    console.log('\n[4/5] Creating attribute_options table...');
    try {
      await connection.execute(`
        CREATE TABLE attribute_options (
          id VARCHAR(36) PRIMARY KEY,
          definitionId VARCHAR(36) NOT NULL,
          value VARCHAR(100) NOT NULL,
          displayOrder INT DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_definitionId (definitionId)
        )
      `);
      console.log('  ✓ Created attribute_options table');
    } catch (err) {
      if (err.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('  ✓ attribute_options table already exists');
      } else throw err;
    }

    // Step 5: Migrate existing data
    console.log('\n[5/5] Migrating existing variant data...');
    
    // Get all products that have variants
    const [productsWithVariants] = await connection.execute(`
      SELECT DISTINCT productId FROM product_variants
    `);
    const productIds = productsWithVariants.map(p => p.productId);
    
    if (productIds.length > 0) {
      // Mark products as having variants
      const placeholders = productIds.map(() => '?').join(',');
      await connection.execute(`
        UPDATE products SET hasVariants = TRUE WHERE id IN (${placeholders})
      `, productIds);
      console.log(`  ✓ Marked ${productIds.length} products as having variants`);
      
      // Get unique attributes from variants
      const [attributes] = await connection.execute(`
        SELECT DISTINCT productId, 'color' as attrType FROM product_variants WHERE color IS NOT NULL AND color != ''
        UNION
        SELECT DISTINCT productId, 'size' as attrType FROM product_variants WHERE size IS NOT NULL AND size != ''
        UNION
        SELECT DISTINCT productId, 'flavor' as attrType FROM product_variants WHERE flavor IS NOT NULL AND flavor != ''
      `);
      
      // Create attribute definitions
      const uuid = require('crypto').randomUUID;
      for (const attr of attributes) {
        await connection.execute(`
          INSERT INTO product_attribute_definitions (id, productId, attributeType, attributeLabel, isRequired, displayOrder)
          VALUES (?, ?, ?, ?, TRUE, ?)
          ON DUPLICATE KEY UPDATE attributeLabel = VALUES(attributeLabel)
        `, [
          uuid(),
          attr.productId,
          attr.attrType,
          attr.attrType.charAt(0).toUpperCase() + attr.attrType.slice(1),
          attr.attrType === 'color' ? 1 : attr.attrType === 'size' ? 2 : 3
        ]);
      }
      console.log(`  ✓ Created ${attributes.length} attribute definitions`);
      
      // Get all variants and migrate their attributes
      const [variants] = await connection.execute(`
        SELECT id, color, size, flavor FROM product_variants
        WHERE (color IS NOT NULL AND color != '')
           OR (size IS NOT NULL AND size != '')
           OR (flavor IS NOT NULL AND flavor != '')
      `);
      
      let migratedCount = 0;
      for (const variant of variants) {
        const values = [];
        if (variant.color) values.push({ type: 'color', value: variant.color });
        if (variant.size) values.push({ type: 'size', value: variant.size });
        if (variant.flavor) values.push({ type: 'flavor', value: variant.flavor });
        
        for (const v of values) {
          try {
            await connection.execute(`
              INSERT INTO variant_attribute_values (id, variantId, attributeType, value)
              VALUES (?, ?, ?, ?)
              ON DUPLICATE KEY UPDATE value = VALUES(value)
            `, [uuid(), variant.id, v.type, v.value]);
          } catch (err) {
            // Ignore duplicates
          }
        }
        migratedCount++;
      }
      console.log(`  ✓ Migrated attributes for ${migratedCount} variants`);
    } else {
      console.log('  ⚠ No products with variants to migrate');
    }

    console.log('\n' + '='.repeat(50));
    console.log('Phase 1 Migration Complete!\n');

    // Summary
    console.log('Summary:');
    const [defCount] = await connection.execute('SELECT COUNT(*) as count FROM product_attribute_definitions');
    const [valCount] = await connection.execute('SELECT COUNT(*) as count FROM variant_attribute_values');
    const [hasVarCount] = await connection.execute('SELECT COUNT(*) as count FROM products WHERE hasVariants = TRUE');
    
    console.log(`  - Attribute definitions: ${defCount[0].count}`);
    console.log(`  - Attribute values: ${valCount[0].count}`);
    console.log(`  - Products with variants: ${hasVarCount[0].count}`);

  } catch (error) {
    console.error('\n✗ Migration failed:', error.message);
    throw error;
  } finally {
    await connection.end();
  }
}

migrate().catch(console.error);
