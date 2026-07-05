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

async function seedProductAssociations() {
  await dataSource.initialize();

  // Get all brands
  const brands: any[] = await dataSource.query("SELECT * FROM brands");

  // Get all departments
  const departments: any[] = await dataSource.query("SELECT * FROM departments");

  // Get all products with their categories
  const products: any[] = await dataSource.query(`
    SELECT p.*, c.name as category_name 
    FROM products p 
    LEFT JOIN categories c ON p.categoryId = c.id
  `);

  let brandUpdated = 0;
  let deptUpdated = 0;

  for (const product of products) {
    let brandChanged = false;
    let deptChanged = false;

    // Associate brand based on product name
    if (!product.brandId) {
      for (const brand of brands) {
        const nameLower = product.name.toLowerCase();
        const brandNameLower = brand.name.toLowerCase();
        const brandSlugLower = brand.slug.toLowerCase();

        if (
          nameLower.includes(brandNameLower) ||
          nameLower.includes(brandSlugLower) ||
          (brandNameLower.includes("prevest") && nameLower.includes("prevest")) ||
          (brandNameLower.includes("nsk") && (nameLower.includes("nsk") || nameLower.includes(" nsk"))) ||
          (brandNameLower.includes("3m") && (nameLower.includes("3m") || nameLower.includes("espe"))) ||
          (brandNameLower.includes("gc") && (nameLower.includes("gc ") || nameLower.includes("gc,"))) ||
          (brandNameLower.includes("woodpecker") && nameLower.includes("woodpecker")) ||
          (brandNameLower.includes("dentsply") && nameLower.includes("dentsply")) ||
          (brandNameLower.includes("kuraray") && nameLower.includes("kuraray")) ||
          (brandNameLower.includes("meta biomed") && (nameLower.includes("meta") || nameLower.includes("biomed")))
        ) {
          await dataSource.query(
            "UPDATE products SET brandId = ?, brand = ? WHERE id = ?",
            [brand.id, brand.name, product.id]
          );
          brandChanged = true;
          brandUpdated++;
          break;
        }
      }
    }

    // Associate department based on category name
    if (product.category_name) {
      const categoryName = product.category_name.toLowerCase();
      let assignedDeptId = null;

      // Map categories to departments
      if (categoryName.includes("endodontics") || categoryName.includes("composite") || 
          categoryName.includes("bonding") || categoryName.includes("endodontic")) {
        assignedDeptId = departments.find((d) => d.name === "Endodontics")?.id;
      } else if (categoryName.includes("restoratives") || categoryName.includes("cement") || 
                 categoryName.includes("filling")) {
        assignedDeptId = departments.find((d) => d.name === "Restorative")?.id;
      } else if (categoryName.includes("oral surgery") || categoryName.includes("extraction") || 
                 categoryName.includes("surgical")) {
        assignedDeptId = departments.find((d) => d.name === "Oral Surgery")?.id;
      } else if (categoryName.includes("periodontics") || categoryName.includes("scaling") || 
                 categoryName.includes("periodontal")) {
        assignedDeptId = departments.find((d) => d.name === "Periodontics")?.id;
      } else if (categoryName.includes("implant")) {
        assignedDeptId = departments.find((d) => d.name === "Implantology")?.id;
      } else if (categoryName.includes("pediatric") || categoryName.includes("children") || 
                 categoryName.includes("kids")) {
        assignedDeptId = departments.find((d) => d.name === "Pediatric Dentistry")?.id;
      } else if (categoryName.includes("radiology") || categoryName.includes("x-ray") || 
                 categoryName.includes("imaging")) {
        assignedDeptId = departments.find((d) => d.name === "Radiology")?.id;
      } else if (categoryName.includes("prosthodontics") || categoryName.includes("crown") || 
                 categoryName.includes("bridge") || categoryName.includes("denture")) {
        assignedDeptId = departments.find((d) => d.name === "Prosthodontics")?.id;
      } else if (categoryName.includes("orthodontics") || categoryName.includes("braces") || 
                 categoryName.includes("aligner")) {
        assignedDeptId = departments.find((d) => d.name === "Orthodontics")?.id;
      } else if (categoryName.includes("infection") || categoryName.includes("sterilization") ||
                 categoryName.includes("ppe")) {
        assignedDeptId = departments.find((d) => d.name === "General Dentistry")?.id;
      } else {
        // Default to General Dentistry for unclassified
        assignedDeptId = departments.find((d) => d.name === "General Dentistry")?.id;
      }

      if (assignedDeptId) {
        // Insert into product_departments junction table
        try {
          await dataSource.query(
            "INSERT IGNORE INTO product_departments (productId, departmentId) VALUES (?, ?)",
            [product.id, assignedDeptId]
          );
          const dept = departments.find((d) => d.id === assignedDeptId);
          deptChanged = true;
          deptUpdated++;
        } catch (err: any) {
          if (err.code !== 'ER_DUP_ENTRY') {
            console.error(`  Error assigning dept: ${err.message}`);
          }
        }
      }
    }
  }

  
  await dataSource.destroy();
}

seedProductAssociations().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
