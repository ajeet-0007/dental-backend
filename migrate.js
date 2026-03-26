const mysql = require('mysql2/promise');

async function migrate() {
  const connection = await mysql.createConnection({
    host: 'mysql-273847d1-as1911018-cea6.f.aivencloud.com',
    port: 27873,
    user: 'avnadmin',
    password: 'AVNS_IGYST4u2H1WpZ0s7mf4',
    database: 'defaultdb'
  });

  try {
    await connection.execute('ALTER TABLE products ADD COLUMN expiresAt DATETIME NULL');
    console.log('Successfully added expiresAt column to products table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column expiresAt already exists in products table');
    } else {
      console.error('Error adding expiresAt to products:', error.message);
    }
  }

  try {
    await connection.execute('ALTER TABLE product_variants ADD COLUMN expiresAt DATETIME NULL');
    console.log('Successfully added expiresAt column to product_variants table');
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('Column expiresAt already exists in product_variants table');
    } else {
      console.error('Error adding expiresAt to product_variants:', error.message);
    }
  }

  await connection.end();
}

migrate();
