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

const DENTAL_IMAGES = [
  'https://images.unsplash.com/photo-1629909615184-74f495363b67',
  'https://images.unsplash.com/photo-1606811841689-23dfddce3e95',
  'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5',
  'https://images.unsplash.com/photo-1559757148-5c350d0d3c56',
  'https://images.unsplash.com/photo-1609840114035-3c981b782dfe',
  'https://images.unsplash.com/photo-1571772996211-2f02c9727629',
  'https://images.unsplash.com/photo-1583321500900-82807e458f3c',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d',
];

function getRandomImage(): string {
  const img = DENTAL_IMAGES[Math.floor(Math.random() * DENTAL_IMAGES.length)];
  return `["${img}?w=400&h=400&fit=crop"]`;
}

async function seedMoreCategoriesAndProducts() {
  await dataSource.initialize();
  console.log('Connected to database');

  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();

  try {
    const newCategories = [
      { name: 'Preventive Care', slug: 'preventive-care', description: 'Preventive dental care products' },
      { name: 'Restoratives', slug: 'restoratives', description: 'Dental restorative materials' },
      { name: 'Surgical Instruments', slug: 'surgical-instruments', description: 'Surgical dental instruments' },
      { name: 'Infection Control', slug: 'infection-control', description: 'Dental infection control supplies' },
      { name: 'Safety', slug: 'safety', description: 'Dental safety products and equipment' },
      { name: 'Prosthodontics', slug: 'prosthodontics', description: 'Dentures and prosthetics' },
      { name: 'Pediatric Dentistry', slug: 'pediatric-dentistry', description: 'Pediatric dental products' },
      { name: 'Dental Accessories', slug: 'dental-accessories', description: 'Various dental accessories' },
      { name: 'X-Ray & Imaging', slug: 'xray-imaging', description: 'Dental imaging and radiography' },
    ];

    const catMap: Record<string, number> = {};

    for (const cat of newCategories) {
      const existing = await queryRunner.query(
        'SELECT id FROM categories WHERE slug = ?',
        [cat.slug]
      );
      
      if (existing.length === 0) {
        const result = await queryRunner.query(
          'INSERT INTO categories (name, slug, description, isActive, sortOrder, createdAt, updatedAt) VALUES (?, ?, ?, 1, 0, NOW(), NOW())',
          [cat.name, cat.slug, cat.description]
        );
        catMap[cat.slug] = result.insertId;
        console.log(`Created category: ${cat.name}`);
      } else {
        catMap[cat.slug] = existing[0].id;
        console.log(`Category already exists: ${cat.name}`);
      }
    }

    const productsData: Array<[string, string, string, string, number, number, number, string]> = [
      ['Fluoride Gel', 'fluoride-gel', 'PRE-001', 'Professional fluoride treatment gel', 320, 280, 380, 'preventive-care'],
      ['Fluoride Varnish', 'fluoride-varnish', 'PRE-002', 'Sodium fluoride varnish for desensitization', 450, 400, 520, 'preventive-care'],
      ['Dental Sealant', 'dental-sealant', 'PRE-003', 'Pit and fissure sealant', 380, 340, 450, 'preventive-care'],
      ['Interdental Brushes', 'interdental-brushes', 'PRE-004', 'Pack of 20 interdental brushes', 180, 150, 220, 'preventive-care'],
      ['Dental Floss Pack', 'dental-floss-pack', 'PRE-005', 'Mint flavored dental floss', 120, 95, 150, 'preventive-care'],
      ['Toothpaste Specimen', 'toothpaste-specimen', 'PRE-006', 'Professional strength toothpaste', 250, 220, 300, 'preventive-care'],
      ['Mouthwash Concentrate', 'mouthwash-concentrate', 'PRE-007', 'Antiseptic mouthwash', 280, 250, 340, 'preventive-care'],
      ['Prophy Paste', 'prophy-paste', 'PRE-008', 'Prophylaxis paste in various grits', 220, 190, 270, 'preventive-care'],

      ['Amalgam Capsules', 'amalgam-capsules', 'RES-001', 'Pre-dosed amalgam capsules', 680, 620, 780, 'restoratives'],
      ['Flowable Composite', 'flowable-composite', 'RES-002', 'Flowable nanohybrid composite', 850, 780, 950, 'restoratives'],
      ['Packable Composite', 'packable-composite', 'RES-003', 'Packable posterior composite', 920, 850, 1050, 'restoratives'],
      ['Bonding Agent', 'bonding-agent', 'RES-004', 'Total-etch dental adhesive', 580, 520, 680, 'restoratives'],
      ['Etching Gel', 'etching-gel', 'RES-005', '37% phosphoric acid etchant', 180, 150, 220, 'restoratives'],
      ['Base Liner', 'base-liner', 'RES-006', 'Calcium hydroxide liner', 320, 280, 380, 'restoratives'],
      ['Temporary Cement', 'temporary-cement', 'RES-007', 'ZOE temporary cement', 280, 250, 340, 'restoratives'],
      ['Posts and Pins', 'posts-and-pins', 'RES-008', 'Fiber posts and retention pins', 680, 620, 780, 'restoratives'],

      ['Extraction Forceps Set', 'extraction-forceps-set', 'SUR-001', 'Complete extraction forceps set', 2800, 2600, 3200, 'surgical-instruments'],
      ['Periotome Set', 'periotome-set', 'SUR-002', 'Periodontal surgical instruments', 1800, 1650, 2100, 'surgical-instruments'],
      ['Surgical Scalpel', 'surgical-scalpel', 'SUR-003', 'Blade handle and blades', 280, 250, 340, 'surgical-instruments'],
      ['Sutures Kit', 'sutures-kit', 'SUR-004', 'Absorbable and non-absorbable sutures', 680, 620, 780, 'surgical-instruments'],
      ['Bone File', 'bone-file', 'SUR-005', 'Surgical bone file', 450, 400, 550, 'surgical-instruments'],
      ['Tissue Forceps', 'tissue-forceps', 'SUR-006', 'Adson tissue forceps', 380, 340, 450, 'surgical-instruments'],
      ['Needle Holder', 'needle-holder', 'SUR-007', 'Mayo-Hegar needle holder', 520, 470, 600, 'surgical-instruments'],
      ['Surgical Currettes', 'surgical-currettes', 'SUR-008', 'Lucas surgical currette set', 850, 780, 980, 'surgical-instruments'],

      ['Surgical Gloves Box', 'surgical-gloves-box', 'INF-001', 'Latex surgical gloves box of 100', 450, 400, 520, 'infection-control'],
      ['N95 Mask Box', 'n95-mask-box', 'INF-002', 'N95 respirator masks pack of 20', 580, 520, 680, 'infection-control'],
      ['Face Shield', 'face-shield', 'INF-003', 'Full face protective shield', 280, 250, 340, 'infection-control'],
      ['Surface Disinfectant', 'surface-disinfectant', 'INF-004', 'CaviCide surface disinfectant', 650, 590, 750, 'infection-control'],
      ['Hand Sanitizer', 'hand-sanitizer', 'INF-005', '70% alcohol hand sanitizer', 180, 150, 220, 'infection-control'],
      ['Sterilization Pouches', 'sterilization-pouches', 'INF-006', 'Self-sealing sterilization pouches', 420, 380, 500, 'infection-control'],
      ['Barrier Film', 'barrier-film', 'INF-007', 'Barrier film rolls for equipment', 320, 280, 380, 'infection-control'],
      ['Waste Bag System', 'waste-bag-system', 'INF-008', 'Medical waste disposal bags', 280, 250, 340, 'infection-control'],

      ['Complete Denture Set', 'complete-denture-set', 'PRO-001', 'Acrylic complete denture set', 8500, 7800, 9500, 'prosthodontics'],
      ['Partial Denture', 'partial-denture', 'PRO-002', 'Cast partial denture framework', 5200, 4800, 6000, 'prosthodontics'],
      ['Denture Teeth Set', 'denture-teeth-set', 'PRO-003', 'Premium denture teeth', 1800, 1650, 2100, 'prosthodontics'],
      ['Denture Base Material', 'denture-base-material', 'PRO-004', 'Heat-cure acrylic resin', 680, 620, 780, 'prosthodontics'],
      ['Denture Repair Kit', 'denture-repair-kit', 'PRO-005', 'Self-cure repair material', 280, 250, 340, 'prosthodontics'],
      ['Relining Material', 'relining-material', 'PRO-006', 'Soft denture reliner', 420, 380, 500, 'prosthodontics'],
      ['Clasp Wire', 'clasps-wire', 'PRO-007', 'Wrought wire clasps', 180, 150, 220, 'prosthodontics'],
      ['Articulator', 'articulator', 'PRO-008', 'Semi-adjustable articulator', 2800, 2600, 3200, 'prosthodontics'],

      ['Kidz Toothbrush', 'kidz-toothbrush', 'PED-001', 'Children toothbrush set of 3', 180, 150, 220, 'pediatric-dentistry'],
      ['Fluoride Foam', 'fluoride-foam', 'PED-002', 'Children fluoride foam treatment', 320, 280, 380, 'pediatric-dentistry'],
      ['Dental Sealant Kit', 'dental-sealant-kit', 'PED-003', 'Pediatric sealant application kit', 580, 520, 680, 'pediatric-dentistry'],
      ['Pulpectomy Files', 'pulpectomy-files', 'PED-004', 'Pediatric root canal files', 420, 380, 500, 'pediatric-dentistry'],
      ['Space Maintainer', 'space-maintainer', 'PED-005', 'Banded space maintainer', 850, 780, 980, 'pediatric-dentistry'],
      ['Kidz Mirror', 'kidz-mirror', 'PED-006', 'Pediatric mouth mirror', 120, 95, 150, 'pediatric-dentistry'],
      ['Rubber Dam Kit', 'rubber-dam-kit', 'PED-007', 'Pediatric rubber dam kit', 680, 620, 780, 'pediatric-dentistry'],
      ['Topical Anesthetic', 'topical-anesthetic', 'PED-008', 'Flavored topical anesthetic gel', 180, 150, 220, 'pediatric-dentistry'],

      ['Mouth Mirror #4', 'mouth-mirror-4', 'ACC-001', 'Stainless steel mouth mirror', 85, 70, 100, 'dental-accessories'],
      ['Cotton Roll Dispenser', 'cotton-roll-dispenser', 'ACC-002', 'Cotton roll holder and dispenser', 180, 150, 220, 'dental-accessories'],
      ['Aspirating Syringe', 'aspirating-syringe', 'ACC-003', 'Self-aspirating syringe', 450, 400, 550, 'dental-accessories'],
      ['Saliva Ejector', 'saliva-ejector', 'ACC-004', 'Disposable saliva ejectors pack of 50', 120, 95, 150, 'dental-accessories'],
      ['Gauze Squares', 'gauze-squares', 'ACC-005', '2x2 sterile gauze squares box', 80, 65, 100, 'dental-accessories'],
      ['Articulating Paper', 'articulating-paper', 'ACC-006', 'Horseshoe articulating paper', 95, 80, 120, 'dental-accessories'],
      ['Wedges Kit', 'wedges-kit', 'ACC-007', 'Wooden wedges for restorations', 150, 125, 180, 'dental-accessories'],
      ['Matrix Bands', 'matrix-bands', 'ACC-008', 'Tofflemire matrix bands pack', 180, 150, 220, 'dental-accessories'],

      ['Intraoral Camera', 'intraoral-camera', 'XRAY-001', 'USB intraoral dental camera', 12000, 11000, 14000, 'xray-imaging'],
      ['X-Ray Sensor', 'xray-sensor', 'XRAY-002', 'Digital X-ray sensor', 45000, 42000, 52000, 'xray-imaging'],
      ['X-Ray Film', 'xray-film', 'XRAY-003', 'Dental X-ray film pack of 100', 850, 780, 980, 'xray-imaging'],
      ['Film Processor', 'film-processor', 'XRAY-004', 'Automatic film processor', 15000, 14000, 17500, 'xray-imaging'],
      ['Apron and Collar', 'apron-and-collar', 'XRAY-005', 'Lead apron and thyroid collar', 2800, 2600, 3200, 'xray-imaging'],
      ['X-Ray Holder', 'xray-holder', 'XRAY-006', 'Rinn style film holder', 680, 620, 780, 'xray-imaging'],
      ['Dark Room Timer', 'dark-room-timer', 'XRAY-007', 'Safe light timer', 280, 250, 340, 'xray-imaging'],
      ['CBCT Scanner', 'cbct-scanner', 'XRAY-008', 'Cone beam CT scanner', 180000, 165000, 210000, 'xray-imaging'],
    ];

    let productCount = 0;
    for (const [name, slug, sku, desc, price, sellingPrice, mrp, catSlug] of productsData) {
      const existing = await queryRunner.query(
        'SELECT id FROM products WHERE slug = ?',
        [slug]
      );
      
      if (existing.length === 0) {
        const categoryId = catMap[catSlug];
        if (categoryId) {
          await queryRunner.query(
            'INSERT INTO products (name, slug, sku, description, price, sellingPrice, mrp, categoryId, isActive, minOrderQuantity, images, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, ?, NOW(), NOW())',
            [name, slug, sku, desc, price, sellingPrice, mrp, categoryId, getRandomImage()]
          );
          productCount++;
        }
      }
    }

    console.log(`Created ${productCount} new products`);

    const existingInv = await queryRunner.query('SELECT COUNT(*) as cnt FROM inventory');
    const prodsWithoutInv = await queryRunner.query(`
      SELECT p.id FROM products p 
      LEFT JOIN inventory i ON p.id = i.productId 
      WHERE i.id IS NULL
    `);
    
    for (const prod of prodsWithoutInv) {
      await queryRunner.query(
        'INSERT INTO inventory (productId, quantity, lowStockThreshold, createdAt, updatedAt) VALUES (?, ?, 10, NOW(), NOW())',
        [prod.id, 20 + Math.floor(Math.random() * 80)]
      );
    }
    
    if (prodsWithoutInv.length > 0) {
      console.log(`Created inventory for ${prodsWithoutInv.length} products`);
    }

    console.log('Seed completed!');
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedMoreCategoriesAndProducts().catch(console.error);
