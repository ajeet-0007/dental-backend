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

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    // Add AUTO_INCREMENT to id columns and reservedQuantity
    await queryRunner.query('ALTER TABLE categories MODIFY id INT AUTO_INCREMENT');
    await queryRunner.query('ALTER TABLE products MODIFY id INT AUTO_INCREMENT');
    await queryRunner.query('ALTER TABLE inventory MODIFY id INT AUTO_INCREMENT');
    await queryRunner.query('ALTER TABLE orders MODIFY id VARCHAR(36)');
    try {
      await queryRunner.query('ALTER TABLE inventory ADD COLUMN reservedQuantity INT DEFAULT 0');
    } catch (e) {
      // column may already exist
    }
    console.log('Added AUTO_INCREMENT to tables');

    // Check if categories exist
    const existingCats = await queryRunner.query('SELECT COUNT(*) as cnt FROM categories');
    if (parseInt(existingCats[0].cnt) > 0) {
      console.log('Categories already exist, skipping...');
    } else {
      // Insert categories
      const categories = [
        ['Composite', 'composite', 'Dental composite materials'],
        ['Cements', 'cements', 'Dental cements and bonding agents'],
        ['Endodontics', 'endodontics', 'Endodontic materials and tools'],
        ['Rotary Files', 'rotary-files', 'Rotary endodontic files'],
        ['Orthodontics', 'orthodontics', 'Orthodontic supplies'],
        ['Impression Materials', 'impression-materials', 'Dental impression materials'],
        ['Dental Instruments', 'dental-instruments', 'Dental hand instruments'],
        ['Dental Equipment', 'dental-equipment', 'Dental equipment and machinery'],
      ];

      for (const [name, slug, description] of categories) {
        await queryRunner.query(
          'INSERT INTO categories (name, slug, description, isActive, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, 1, 0, NOW(), NOW())',
          [name, slug, description]
        );
      }
      console.log('Categories created');
    }

    // Check if products exist
    const existingProds = await queryRunner.query('SELECT COUNT(*) as cnt FROM products');
    if (parseInt(existingProds[0].cnt) > 0) {
      console.log('Products already exist, skipping...');
    } else {
      // Get category IDs
      const cats = await queryRunner.query('SELECT id, slug FROM categories');
      const catMap: Record<string, number> = {};
      for (const cat of cats) {
        catMap[cat.slug] = Number(cat.id);
      }

      // Insert products
      const products = [
        ['Filtek Supreme Ultra', 'filtek-supreme-ultra', 'COM-001', 'Universal nanohybrid composite', 780, 950, 'composite'],
        ['Filtek Z250', 'filtek-z250', 'COM-002', 'Microhybrid composite resin', 650, 800, 'composite'],
        ['Filtek P60', 'filtek-p60', 'COM-003', 'Posterior restorative composite', 620, 750, 'composite'],
        ['GC Fuji IX GP', 'gc-fuji-ix-gp', 'COM-004', 'Glass ionomer cement', 420, 500, 'composite'],
        ['Ketac Fil Plus', 'ketac-fil-plus', 'COM-005', 'Conventional glass ionomer', 350, 420, 'composite'],
        ['GC FujiCem 2', 'gc-fujicem-2', 'CEM-001', 'Resin modified glass ionomer cement', 850, 1000, 'cements'],
        ['RelyX Luting Cement', 'relyx-luting-cement', 'CEM-002', 'Self-adhesive resin cement', 1150, 1400, 'cements'],
        ['Panavia F2.0', 'panavia-f2', 'CEM-003', 'Resin cement for crowns', 1450, 1750, 'cements'],
        ['Multilink Automix', 'multilink-automix', 'CEM-004', 'Self-etching cement', 1300, 1600, 'cements'],
        ['RelyX Ultimate', 'relyx-ultimate', 'CEM-005', 'Universal adhesive resin cement', 1550, 1850, 'cements'],
        ['ProRoot MTA', 'proroot-mta', 'END-001', 'Mineral trioxide aggregate', 2000, 2500, 'endodontics'],
        ['AH Plus', 'ah-plus', 'END-002', 'Epoxy resin root canal sealer', 1350, 1600, 'endodontics'],
        ['RC Prep', 'rc-prep', 'END-003', 'Endodontic lubricant', 250, 320, 'endodontics'],
        ['Sodium Hypochlorite', 'sodium-hypochlorite', 'END-004', 'Root canal irrigant', 120, 180, 'endodontics'],
        ['EDTA 17%', 'edta-17', 'END-005', 'Chelating agent', 150, 220, 'endodontics'],
        ['ProTaper Gold', 'protaper-gold', 'ROT-001', 'NiTi rotary file system', 2600, 3200, 'rotary-files'],
        ['WaveOne Gold', 'waveone-gold', 'ROT-002', 'Reciprocating file system', 2200, 2800, 'rotary-files'],
        ['Reciproc Blue', 'reciproc-blue', 'ROT-003', 'M-Wire reciprocating file', 2000, 2500, 'rotary-files'],
        ['ProTaper Next', 'protaper-next', 'ROT-004', 'Continuous rotation files', 2400, 3000, 'rotary-files'],
        ['HyFlex CM', 'hyflex-cm', 'ROT-005', 'Controlled memory NiTi file', 1900, 2400, 'rotary-files'],
        ['DentaReach Brackets', 'dentareach-brackets', 'ORT-001', 'Metal orthodontic brackets', 4200, 5000, 'orthodontics'],
        ['Ortho Chain', 'ortho-chain', 'ORT-002', 'Elastomeric chain', 250, 350, 'orthodontics'],
        ['NiTi Archwire', 'niti-archwire', 'ORT-003', 'Shape memory archwire', 400, 550, 'orthodontics'],
        ['Ligature Wire', 'ligature-wire', 'ORT-004', 'Stainless steel ligature', 150, 220, 'orthodontics'],
        ['Orthodontic Adhesive', 'orthodontic-adhesive', 'ORT-005', 'Light cure bonding resin', 620, 780, 'orthodontics'],
        ['Jiffy Impression', 'jiffy-impression', 'IMP-001', 'Addition silicone putty', 480, 600, 'impression-materials'],
        ['Aquasil Ultra', 'aquasil-ultra', 'IMP-002', 'Precision VPS impression', 780, 950, 'impression-materials'],
        ['Imprint 4', 'imprint-4', 'IMP-003', 'PVS impression material', 680, 820, 'impression-materials'],
        ['Alginate Fast Set', 'alginate-fast-set', 'IMP-004', 'Irreversible hydrocolloid', 150, 220, 'impression-materials'],
        ['Reprosil', 'reprosil', 'IMP-005', 'VPS impression material', 600, 750, 'impression-materials'],
        ['Mirror #5', 'mirror-5', 'INS-001', 'Plain mirror', 35, 60, 'dental-instruments'],
        ['Explorer', 'explorer', 'INS-002', 'Dental explorer', 45, 70, 'dental-instruments'],
        ['Sickle Scaler', 'sickle-scaler', 'INS-003', 'Periodontal scaler', 70, 100, 'dental-instruments'],
        ['Forceps #150', 'forceps-150', 'INS-004', 'Extraction forceps', 290, 380, 'dental-instruments'],
        ['Amalgam Carrier', 'amalgam-carrier', 'INS-005', 'Amalgam placement instrument', 160, 220, 'dental-instruments'],
        ['Dental Chair Basic', 'dental-chair-basic', 'EQP-001', 'Standard dental chair', 78000, 95000, 'dental-equipment'],
        ['LED Curing Light', 'led-curing-light', 'EQP-002', 'Cordless LED light', 4200, 5200, 'dental-equipment'],
        ['Ultrasonic Scaler', 'ultrasonic-scaler', 'EQP-003', 'Piezo scaler', 6200, 7800, 'dental-equipment'],
        ['X-Ray Unit', 'x-ray-unit', 'EQP-004', 'Intraoral X-ray', 23000, 28000, 'dental-equipment'],
        ['Autoclave 18L', 'autoclave-18l', 'EQP-005', 'Steam sterilizer', 14000, 17000, 'dental-equipment'],
      ];

      for (const [name, slug, sku, desc, sellingPrice, mrp, catSlug] of products) {
        await queryRunner.query(
          'INSERT INTO products (name, slug, sku, description, sellingPrice, mrp, categoryId, isActive, minOrderQuantity, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 1, NOW(), NOW())',
          [name, slug, sku, desc, sellingPrice, mrp, catMap[catSlug as string]]
        );
      }
      console.log('Products created');
    }

    // Check if inventory exists
    const existingInv = await queryRunner.query('SELECT COUNT(*) as cnt FROM inventory');
    if (parseInt(existingInv[0].cnt) > 0) {
      console.log('Inventory already exists, skipping...');
    } else {
      const prods = await queryRunner.query('SELECT id FROM products');
      for (const prod of prods) {
        await queryRunner.query(
          'INSERT INTO inventory (productId, quantity, lowStockThreshold, createdAt, updatedAt) VALUES (?, ?, 10, NOW(), NOW())',
          [prod.id, 50 + Math.floor(Math.random() * 100)]
        );
      }
      console.log('Inventory created');
    }

    console.log('Seed completed!');
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seed().catch(console.error);
