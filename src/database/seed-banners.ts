import { DataSource } from "typeorm";
import { Banner } from "./entities/banner.entity";

require("dotenv").config();

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_DATABASE_HOST,
  port: parseInt(process.env.MYSQL_DATABASE_PORT || "3306"),
  username: process.env.MYSQL_DATABASE_USER,
  password: process.env.MYSQL_DATABASE_PASSWORD,
  database: process.env.MYSQL_DATABASE_NAME,
  entities: [Banner],
});

const sampleBanners = [
  {
    title: "Dental Equipment Sale",
    subtitle: "Up to 40% off on premium dental equipment",
    image: "https://r2dkmedia.dentalkart.com/backend-media-uploads/HomepageImages/IDentical--Dental-Manikin-(M1003-3)-DT.jpg",
    link: "/products?category=dental-equipment",
    isActive: true,
    sortOrder: 1,
  },
  {
    title: "3D Printing Resins",
    subtitle: "Professional grade dental resins starting at ₹999",
    image: "https://r2dkmedia.dentalkart.com/backend-media-uploads/HomepageImages/Arma-Dental-3D-Printing-Resin---Temp-Ultra-Slider-(1-KG)-DT.jpg",
    link: "/products?category=laboratory",
    isActive: true,
    sortOrder: 2,
  },
  {
    title: "ColoCast Available Now",
    subtitle: "Revolutionary dental casting solution",
    image: "https://r2dkmedia.dentalkart.com/backend-media-uploads/HomepageImages/ColoCast-DT.jpg",
    link: "/products/colocast",
    isActive: true,
    sortOrder: 3,
  },
  {
    title: "Flexy NiTi Archwires",
    subtitle: "Premium orthodontic archwires - Best prices",
    image: "https://r2dkmedia.dentalkart.com/backend-media-uploads/HomepageImages/Flexy-NiTi-Archwires-DT (1).jpg",
    link: "/products?category=orthodontics",
    isActive: true,
    sortOrder: 4,
  },
  {
    title: "Special Dental Events",
    subtitle: "Exclusive offers on dental supplies",
    image: "https://r2dkmedia.dentalkart.com/backend-media-uploads/HomepageImages/Event-DT.jpg",
    link: "/products",
    isActive: true,
    sortOrder: 5,
  },
];

async function seedBanners() {
  try {
    await dataSource.initialize();

    // Create table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        subtitle VARCHAR(255),
        image VARCHAR(500) NOT NULL,
        link VARCHAR(500),
        isActive BOOLEAN DEFAULT true,
        sortOrder INT DEFAULT 0,
        startDate DATETIME,
        endDate DATETIME,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    const bannerRepo = dataSource.getRepository(Banner);

    // Clear existing banners
    await bannerRepo.clear();

    // Insert sample banners
    for (const bannerData of sampleBanners) {
      const banner = bannerRepo.create(bannerData);
      await bannerRepo.save(banner);
    }

    await dataSource.destroy();
  } catch (error) {
    console.error("Error seeding banners:", error);
    process.exit(1);
  }
}

seedBanners();
