import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'mysql',
  host: 'mysql-273847d1-as1911018-cea6.f.aivencloud.com',
  port: 27873,
  username: 'avnadmin',
  password: 'AVNS_IGYST4u2H1WpZ0s7mf4',
  database: 'defaultdb',
  synchronize: false,
});

async function seedVariants() {
  await dataSource.initialize();
  console.log('Connected to database');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Get some products to add variants to
    const products = await queryRunner.query(`
      SELECT id, name FROM products 
      WHERE isActive = 1 
      LIMIT 10
    `);

    const variantsData = [
      // Product 1: Fluoride Gel - different sizes
      { productId: products[0]?.id, name: 'Fluoride Gel - Small', sku: 'PRE-001-S', price: 200, sellingPrice: 180, mrp: 250, size: '50g', color: null, flavor: null, packQuantity: 1 },
      { productId: products[0]?.id, name: 'Fluoride Gel - Medium', sku: 'PRE-001-M', price: 320, sellingPrice: 280, mrp: 380, size: '100g', color: null, flavor: null, packQuantity: 1 },
      { productId: products[0]?.id, name: 'Fluoride Gel - Large', sku: 'PRE-001-L', price: 450, sellingPrice: 400, mrp: 500, size: '200g', color: null, flavor: null, packQuantity: 1 },

      // Product 2: Dental Floss - different flavors
      { productId: products[4]?.id, name: 'Dental Floss - Mint', sku: 'PRE-005-MINT', price: 120, sellingPrice: 95, mrp: 150, size: null, color: null, flavor: 'Mint', packQuantity: 1 },
      { productId: products[4]?.id, name: 'Dental Floss - Spearmint', sku: 'PRE-005-SPEC', price: 120, sellingPrice: 95, mrp: 150, size: null, color: null, flavor: 'Spearmint', packQuantity: 1 },
      { productId: products[4]?.id, name: 'Dental Floss - Cinnamon', sku: 'PRE-005-CINN', price: 120, sellingPrice: 95, mrp: 150, size: null, color: null, flavor: 'Cinnamon', packQuantity: 1 },

      // Product 3: Surgical Gloves - different colors and sizes
      { productId: products[14]?.id, name: 'Surgical Gloves - White Small', sku: 'INF-001-WS', price: 480, sellingPrice: 420, mrp: 550, size: 'Small', color: 'White', flavor: null, packQuantity: 100 },
      { productId: products[14]?.id, name: 'Surgical Gloves - White Medium', sku: 'INF-001-WM', price: 480, sellingPrice: 420, mrp: 550, size: 'Medium', color: 'White', flavor: null, packQuantity: 100 },
      { productId: products[14]?.id, name: 'Surgical Gloves - White Large', sku: 'INF-001-WL', price: 480, sellingPrice: 420, mrp: 550, size: 'Large', color: 'White', flavor: null, packQuantity: 100 },
      { productId: products[14]?.id, name: 'Surgical Gloves - Blue Small', sku: 'INF-001-BS', price: 500, sellingPrice: 440, mrp: 580, size: 'Small', color: 'Blue', flavor: null, packQuantity: 100 },
      { productId: products[14]?.id, name: 'Surgical Gloves - Blue Medium', sku: 'INF-001-BM', price: 500, sellingPrice: 440, mrp: 580, size: 'Medium', color: 'Blue', flavor: null, packQuantity: 100 },
      { productId: products[14]?.id, name: 'Surgical Gloves - Blue Large', sku: 'INF-001-BL', price: 500, sellingPrice: 440, mrp: 580, size: 'Large', color: 'Blue', flavor: null, packQuantity: 100 },

      // Product 4: Mouthwash - different sizes and flavors
      { productId: products[6]?.id, name: 'Mouthwash - Mint 250ml', sku: 'PRE-007-M250', price: 180, sellingPrice: 150, mrp: 220, size: '250ml', color: null, flavor: 'Mint', packQuantity: 1 },
      { productId: products[6]?.id, name: 'Mouthwash - Mint 500ml', sku: 'PRE-007-M500', price: 280, sellingPrice: 250, mrp: 340, size: '500ml', color: null, flavor: 'Mint', packQuantity: 1 },
      { productId: products[6]?.id, name: 'Mouthwash - Spearmint 250ml', sku: 'PRE-007-S250', price: 180, sellingPrice: 150, mrp: 220, size: '250ml', color: null, flavor: 'Spearmint', packQuantity: 1 },
      { productId: products[6]?.id, name: 'Mouthwash - Spearmint 500ml', sku: 'PRE-007-S500', price: 280, sellingPrice: 250, mrp: 340, size: '500ml', color: null, flavor: 'Spearmint', packQuantity: 1 },

      // Product 5: Composite - different shades
      { productId: products[9]?.id, name: 'Composite A1', sku: 'COM-A1', price: 850, sellingPrice: 780, mrp: 950, size: null, color: 'A1 (Light)', flavor: null, packQuantity: 1 },
      { productId: products[9]?.id, name: 'Composite A2', sku: 'COM-A2', price: 850, sellingPrice: 780, mrp: 950, size: null, color: 'A2 (Medium)', flavor: null, packQuantity: 1 },
      { productId: products[9]?.id, name: 'Composite A3', sku: 'COM-A3', price: 850, sellingPrice: 780, mrp: 950, size: null, color: 'A3 (Dark)', flavor: null, packQuantity: 1 },

      // Product 6: Extraction Forceps - different sizes
      { productId: products[15]?.id, name: 'Extraction Forceps - Pediatric', sku: 'SUR-001-PED', price: 1800, sellingPrice: 1650, mrp: 2100, size: 'Pediatric', color: null, flavor: null, packQuantity: 1 },
      { productId: products[15]?.id, name: 'Extraction Forceps - Adult', sku: 'SUR-001-ADT', price: 2800, sellingPrice: 2600, mrp: 3200, size: 'Adult', color: null, flavor: null, packQuantity: 1 },

      // Product 7: Cotton Rolls - different pack sizes
      { productId: products[21]?.id, name: 'Cotton Rolls - 100 pack', sku: 'ACC-002-100', price: 120, sellingPrice: 100, mrp: 150, size: null, color: null, flavor: null, packQuantity: 100 },
      { productId: products[21]?.id, name: 'Cotton Rolls - 500 pack', sku: 'ACC-002-500', price: 450, sellingPrice: 380, mrp: 550, size: null, color: null, flavor: null, packQuantity: 500 },
      { productId: products[21]?.id, name: 'Cotton Rolls - 1000 pack', sku: 'ACC-002-1K', price: 800, sellingPrice: 680, mrp: 950, size: null, color: null, flavor: null, packQuantity: 1000 },

      // Product 8: Articulating Paper - different sizes
      { productId: products[26]?.id, name: 'Articulating Paper - 100 pack', sku: 'ACC-006-100', price: 120, sellingPrice: 95, mrp: 150, size: '100 sheets', color: null, flavor: null, packQuantity: 100 },
      { productId: products[26]?.id, name: 'Articulating Paper - 300 pack', sku: 'ACC-006-300', price: 280, sellingPrice: 240, mrp: 340, size: '300 sheets', color: null, flavor: null, packQuantity: 300 },
    ];

    let variantCount = 0;
    for (const variant of variantsData) {
      if (!variant.productId) continue;

      // Check if variant already exists
      const existing = await queryRunner.query(
        'SELECT id FROM product_variants WHERE sku = ?',
        [variant.sku]
      );

      if (existing.length === 0) {
        await queryRunner.query(
          `INSERT INTO product_variants 
           (productId, name, sku, price, sellingPrice, mrp, size, color, flavor, packQuantity, isActive, createdAt, updatedAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())`,
          [
            variant.productId,
            variant.name,
            variant.sku,
            variant.price,
            variant.sellingPrice,
            variant.mrp,
            variant.size,
            variant.color,
            variant.flavor,
            variant.packQuantity,
          ]
        );
        variantCount++;
        console.log(`Created variant: ${variant.name}`);
      } else {
        console.log(`Variant already exists: ${variant.name}`);
      }
    }

    console.log(`\nCreated ${variantCount} new variants!`);
    console.log('Seed completed!');

  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedVariants().catch(console.error);
