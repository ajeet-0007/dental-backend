import { DataSource } from "typeorm";
import { User, UserRole } from "./src/database/entities/user.entity";
import * as bcrypt from "bcrypt";
import * as path from "path";

const dataSource = new DataSource({
  type: "mysql",
  host: "mysql-273847d1-as1911018-cea6.f.aivencloud.com",
  port: 27873,
  username: "avnadmin",
  password: "AVNS_IGYST4u2H1WpZ0s7mf4",
  database: "defaultdb",
  entities: [path.join(__dirname, "src/database/entities/*.entity{.ts,.js}")],
  synchronize: false,
});

async function createAdminUser() {
  await dataSource.initialize();
  console.log("Connected to database");

  const userRepo = dataSource.getRepository(User);

  const email = "admin@dentalkart.com";
  const existing = await userRepo.findOne({ where: { email: email } });

  if (existing) {
    existing.role = UserRole.ADMIN;
    existing.isActive = true;
    await userRepo.save(existing);
    console.log("Updated existing user to admin:", email);
  } else {
    const hashedPassword = await bcrypt.hash("admin123", 10);
    const admin = userRepo.create({
      email: email,
      phone: "9999999999",
      password: hashedPassword,
      firstName: "Admin",
      lastName: "Dentalkart",
      role: UserRole.ADMIN,
      isActive: true,
    });
    await userRepo.save(admin);
    console.log("Created admin user:", email);
  }

  await dataSource.destroy();
  console.log("Done!");
}

createAdminUser().catch(console.error);
