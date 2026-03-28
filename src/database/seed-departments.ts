import { DataSource } from "typeorm";
import { Department } from "./entities/department.entity";

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

const departments = [
  {
    name: "Orthodontics",
    slug: "orthodontics",
    description: "Products for orthodontic treatments including braces, brackets, archwires, and aligners.",
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 1,
  },
  {
    name: "Endodontics",
    slug: "endodontics",
    description: "Root canal treatments, rotary files, gutta-percha, and endodontic accessories.",
    image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 2,
  },
  {
    name: "Prosthodontics",
    slug: "prosthodontics",
    description: "Crowns, bridges, dentures, and prosthetic dental materials.",
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 3,
  },
  {
    name: "Oral Surgery",
    slug: "oral-surgery",
    description: "Surgical instruments, extraction forceps, sutures, and surgical supplies.",
    image: "https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 4,
  },
  {
    name: "Periodontics",
    slug: "periodontics",
    description: "Periodontal instruments, scaling tips, and gum treatment materials.",
    image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 5,
  },
  {
    name: "Implantology",
    slug: "implantology",
    description: "Dental implants, surgical guides, and implant accessories.",
    image: "https://images.unsplash.com/photo-1581093458791-9f3c3900df4b?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 6,
  },
  {
    name: "Pediatric Dentistry",
    slug: "pediatric-dentistry",
    description: "Products designed for children's dental care and pediatric treatments.",
    image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 7,
  },
  {
    name: "General Dentistry",
    slug: "general-dentistry",
    description: "Essential dental supplies, equipment, and materials for general dental practice.",
    image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 8,
  },
  {
    name: "Restorative",
    slug: "restorative",
    description: "Composite resins, bonding agents, cements, and restorative materials.",
    image: "https://images.unsplash.com/photo-1583324113626-70df0f4dea8e?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 9,
  },
  {
    name: "Radiology",
    slug: "radiology",
    description: "Dental X-ray equipment, sensors, and imaging supplies.",
    image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=300&fit=crop",
    isActive: true,
    sortOrder: 10,
  },
];

async function seedDepartments() {
  try {
    await dataSource.initialize();
    console.log("Database connected");

    // Create table if it doesn't exist
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) UNIQUE NOT NULL,
        description TEXT,
        image VARCHAR(500),
        isActive BOOLEAN DEFAULT true,
        sortOrder INT DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Ensured departments table exists");

    // Create join tables
    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS category_departments (
        categoryId INT NOT NULL,
        departmentId INT NOT NULL,
        PRIMARY KEY (categoryId, departmentId),
        FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
      )
    `);

    await dataSource.query(`
      CREATE TABLE IF NOT EXISTS product_departments (
        productId INT NOT NULL,
        departmentId INT NOT NULL,
        PRIMARY KEY (productId, departmentId),
        FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
      )
    `);
    console.log("Ensured join tables exist");

    const departmentRepo = dataSource.getRepository(Department);

    // Disable foreign key checks and clear
    await dataSource.query("SET FOREIGN_KEY_CHECKS = 0");
    await dataSource.query("TRUNCATE TABLE product_departments");
    await dataSource.query("TRUNCATE TABLE category_departments");
    await dataSource.query("TRUNCATE TABLE departments");
    await dataSource.query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Cleared existing departments");

    // Insert departments
    for (const deptData of departments) {
      const dept = departmentRepo.create(deptData);
      await departmentRepo.save(dept);
      console.log(`Created department: ${deptData.name}`);
    }

    console.log(`\n✅ Successfully seeded ${departments.length} departments`);
    await dataSource.destroy();
  } catch (error) {
    console.error("Error seeding departments:", error);
    process.exit(1);
  }
}

seedDepartments();
