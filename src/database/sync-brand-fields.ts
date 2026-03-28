import { DataSource } from "typeorm";

const dataSource = new DataSource({
  type: "mysql",
  host: "mysql-273847d1-as1911018-cea6.f.aivencloud.com",
  port: 27873,
  username: "avnadmin",
  password: "AVNS_IGYST4u2H1WpZ0s7mf4",
  database: "defaultdb",
  synchronize: false,
});

async function syncBrandFields() {
  console.log("Connecting to database...");
  await dataSource.initialize();
  console.log("Connected!");

  const result = await dataSource.query(`
    UPDATE products p
    JOIN brands b ON p.brandId = b.id
    SET p.brand = b.name
    WHERE p.brand IS NULL AND p.brandId IS NOT NULL
  `);

  console.log(`Updated ${result.affectedRows || 0} products with brand names from brandId`);

  await dataSource.destroy();
  console.log("Done!");
}

syncBrandFields().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
