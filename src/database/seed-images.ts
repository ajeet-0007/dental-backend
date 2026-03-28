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

async function updateImages() {
  console.log("Connecting to database...");
  await dataSource.initialize();
  console.log("Connected!");

  // Update departments with sample images
  const departmentImages = [
    { id: 1, name: "Orthodontics", image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop" },
    { id: 2, name: "Endodontics", image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop" },
    { id: 3, name: "Prosthodontics", image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop" },
    { id: 4, name: "Oral Surgery", image: "https://images.unsplash.com/photo-1571772996211-2f02c9727629?w=400&h=300&fit=crop" },
    { id: 5, name: "Periodontics", image: "https://images.unsplash.com/photo-1598256989800-fe5f95da9787?w=400&h=300&fit=crop" },
    { id: 6, name: "Implantology", image: "https://images.unsplash.com/photo-1598257006458-087169a1f08d?w=400&h=300&fit=crop" },
    { id: 7, name: "Pediatric Dentistry", image: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=400&h=300&fit=crop" },
    { id: 8, name: "General Dentistry", image: "https://images.unsplash.com/photo-1576602976047-174e57a47881?w=400&h=300&fit=crop" },
    { id: 9, name: "Restorative", image: "https://images.unsplash.com/photo-1606220588913-b3aacb4d2f46?w=400&h=300&fit=crop" },
    { id: 10, name: "Radiology", image: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=400&h=300&fit=crop" },
  ];

  console.log("\nUpdating departments...");
  for (const dept of departmentImages) {
    await dataSource.query(
      "UPDATE departments SET image = ? WHERE id = ?",
      [dept.image, dept.id]
    );
    console.log(`  Updated ${dept.name}`);
  }

  // Update brands with sample logos
  const brandLogos = [
    { id: 1, name: "Waldent", logo: "https://placehold.co/200x100/0066CC/ffffff?text=WALDEN" },
    { id: 2, name: "NSK", logo: "https://placehold.co/200x100/FF6600/ffffff?text=NSK" },
    { id: 3, name: "3M ESPE", logo: "https://placehold.co/200x100/CC0000/ffffff?text=3M+ESPE" },
    { id: 4, name: "GC", logo: "https://placehold.co/200x100/003366/ffffff?text=GC" },
    { id: 5, name: "Woodpecker", logo: "https://placehold.co/200x100/009900/ffffff?text=WOODPECKER" },
    { id: 6, name: "SuperEndo", logo: "https://placehold.co/200x100/660066/ffffff?text=SUPERENDO" },
    { id: 7, name: "Dentsply", logo: "https://placehold.co/200x100/003399/ffffff?text=DENTSPLY" },
    { id: 8, name: "MANI", logo: "https://placehold.co/200x100/CC0033/ffffff?text=MANI" },
    { id: 9, name: "Meta Biomed", logo: "https://placehold.co/200x100/009999/ffffff?text=META+BIOMED" },
    { id: 10, name: "Septodont", logo: "https://placehold.co/200x100/006600/ffffff?text=SEPTODONT" },
    { id: 11, name: "Ultradent", logo: "https://placehold.co/200x100/FF0099/ffffff?text=ULTRADENT" },
    { id: 12, name: "Kuraray", logo: "https://placehold.co/200x100/003333/ffffff?text=KURARAY" },
    { id: 13, name: "Prime Dental", logo: "https://placehold.co/200x100/996600/ffffff?text=PRIME+DENTAL" },
    { id: 14, name: "Endoking", logo: "https://placehold.co/200x100/330099/ffffff?text=ENDOKING" },
    { id: 15, name: "Orthometric", logo: "https://placehold.co/200x100/009900/ffffff?text=ORTHOMETRIC" },
    { id: 16, name: "American Eagle", logo: "https://placehold.co/200x100/003399/ffffff?text=AMERICAN+EAGLE" },
    { id: 17, name: "Coltene", logo: "https://placehold.co/200x100/CC6600/ffffff?text=COLTENE" },
    { id: 18, name: "DenMat", logo: "https://placehold.co/200x100/006699/ffffff?text=DENMAT" },
    { id: 19, name: "Garrison", logo: "https://placehold.co/200x100/990033/ffffff?text=GARRISON" },
    { id: 20, name: "Hu-Friedy", logo: "https://placehold.co/200x100/003366/ffffff?text=HU-FRIEDY" },
  ];

  console.log("\nUpdating brands...");
  for (const brand of brandLogos) {
    await dataSource.query(
      "UPDATE brands SET logo = ? WHERE id = ?",
      [brand.logo, brand.id]
    );
    console.log(`  Updated ${brand.name}`);
  }

  console.log("\nDone! Images updated for all departments and brands.");
  
  await dataSource.destroy();
}

updateImages().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
