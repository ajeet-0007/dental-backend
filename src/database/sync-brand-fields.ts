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
  await dataSource.initialize();

  const result = await dataSource.query(`
    UPDATE products p
    JOIN brands b ON p.brandId = b.id
    SET p.brand = b.name
    WHERE p.brand IS NULL AND p.brandId IS NOT NULL
  `);


  await dataSource.destroy();
}

syncBrandFields().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
