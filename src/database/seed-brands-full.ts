import { DataSource } from "typeorm";
import { Brand } from "./entities/brand.entity";

require("dotenv").config();

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_DATABASE_HOST,
  port: parseInt(process.env.MYSQL_DATABASE_PORT || "3306"),
  username: process.env.MYSQL_DATABASE_USER,
  password: process.env.MYSQL_DATABASE_PASSWORD,
  database: process.env.MYSQL_DATABASE_NAME,
  entities: [__dirname + "/entities/*.entity.{ts,js}"],
});

const PLACEHOLDER_LOGO = "https://via.placeholder.com/200x100?text=Brand";

const brands = [
  { name: "Waldent", slug: "waldent", logo: PLACEHOLDER_LOGO, description: "Leading dental equipment and instruments brand", isActive: true, sortOrder: 1 },
  { name: "NSK", slug: "nsk", logo: PLACEHOLDER_LOGO, description: "Premium dental handpieces and equipment", isActive: true, sortOrder: 2 },
  { name: "3M ESPE", slug: "3m-espe", logo: PLACEHOLDER_LOGO, description: "Innovative dental materials and solutions", isActive: true, sortOrder: 3 },
  { name: "GC", slug: "gc", logo: PLACEHOLDER_LOGO, description: "Quality dental products from Japan", isActive: true, sortOrder: 4 },
  { name: "Woodpecker", slug: "woodpecker", logo: PLACEHOLDER_LOGO, description: "Dental equipment and supplies", isActive: true, sortOrder: 5 },
  { name: "SuperEndo", slug: "superendo", logo: PLACEHOLDER_LOGO, description: "Endodontic solutions", isActive: true, sortOrder: 6 },
  { name: "Dentsply", slug: "dentsply", logo: PLACEHOLDER_LOGO, description: "Global dental equipment manufacturer", isActive: true, sortOrder: 7 },
  { name: "MANI", slug: "mani", logo: PLACEHOLDER_LOGO, description: "Japanese dental instruments", isActive: true, sortOrder: 8 },
  { name: "Meta Biomed", slug: "meta-biomed", logo: PLACEHOLDER_LOGO, description: "Dental materials and supplies", isActive: true, sortOrder: 9 },
  { name: "Septodont", slug: "septodont", logo: PLACEHOLDER_LOGO, description: "Dental anesthetics and pharmaceuticals", isActive: true, sortOrder: 10 },
  { name: "Ultradent", slug: "ultradent", logo: PLACEHOLDER_LOGO, description: "Dental whitening and restorative products", isActive: true, sortOrder: 11 },
  { name: "Kuraray", slug: "kuraray", logo: PLACEHOLDER_LOGO, description: "Advanced dental materials", isActive: true, sortOrder: 12 },
  { name: "Prime Dental", slug: "prime-dental", logo: PLACEHOLDER_LOGO, description: "Quality dental products at affordable prices", isActive: true, sortOrder: 13 },
  { name: "Endoking", slug: "endoking", logo: PLACEHOLDER_LOGO, description: "Endodontic equipment", isActive: true, sortOrder: 14 },
  { name: "Orthometric", slug: "orthometric", logo: PLACEHOLDER_LOGO, description: "Orthodontic products and supplies", isActive: true, sortOrder: 15 },
  { name: "American Eagle", slug: "american-eagle", logo: PLACEHOLDER_LOGO, description: "Professional dental instruments", isActive: true, sortOrder: 16 },
  { name: "Coltene", slug: "coltene", logo: PLACEHOLDER_LOGO, description: "Dental impression materials", isActive: true, sortOrder: 17 },
  { name: "DenMat", slug: "denmat", logo: PLACEHOLDER_LOGO, description: "Dental laboratory products", isActive: true, sortOrder: 18 },
  { name: "Garrison", slug: "garrison", logo: PLACEHOLDER_LOGO, description: "Dental matrix systems", isActive: true, sortOrder: 19 },
  { name: "Hu-Friedy", slug: "hu-friedy", logo: PLACEHOLDER_LOGO, description: "Professional dental instruments", isActive: true, sortOrder: 20 },
];

async function seedBrands() {
  try {
    await dataSource.initialize();

    // Create table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        logo VARCHAR(500),
        description TEXT,
        isActive BOOLEAN DEFAULT true,
        sortOrder INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // Add brandId column to products if it doesn't exist
    try {
      await dataSource.query(`
        ALTER TABLE products ADD COLUMN brandId INT
      `);
    } catch (err: any) {
      if (err.code !== 'ER_DUP_FIELDNAME') {
      }
    }

    const brandRepo = dataSource.getRepository(Brand);

    // Clear existing brands
    await brandRepo.clear();

    // Insert brands
    for (const brandData of brands) {
      const brand = brandRepo.create(brandData);
      await brandRepo.save(brand);
    }

    await dataSource.destroy();
  } catch (error) {
    console.error("Error seeding brands:", error);
    process.exit(1);
  }
}

seedBrands();
