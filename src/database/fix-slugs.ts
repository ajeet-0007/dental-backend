import { DataSource } from "typeorm";
import { slugify } from "../common/utils/slugify";

require("dotenv").config();

const APPLY = process.argv.includes("--apply");

const dataSource = new DataSource({
  type: "mysql",
  host: process.env.MYSQL_DATABASE_HOST,
  port: parseInt(process.env.MYSQL_DATABASE_PORT || "3306"),
  username: process.env.MYSQL_DATABASE_USER,
  password: process.env.MYSQL_DATABASE_PASSWORD,
  database: process.env.MYSQL_DATABASE_NAME,
  entities: [],
});

async function fixTable(table: string, seenSlugs: Set<string>): Promise<number> {
  const rows = (await dataSource.query(
    `SELECT id, slug FROM ${table}`,
  )) as { id: number; slug: string }[];
  let changed = 0;

  for (const row of rows) {
    const current = String(row.slug ?? "");
    const cleaned = slugify(current);
    if (cleaned === current) {
      seenSlugs.add(current);
      continue;
    }

    let finalSlug = cleaned;
    let counter = 1;
    while (seenSlugs.has(finalSlug)) {
      finalSlug = `${cleaned}-${counter}`;
      counter++;
    }
    seenSlugs.add(finalSlug);

    if (APPLY) {
      await dataSource.query(`UPDATE ${table} SET slug = ? WHERE id = ?`, [
        finalSlug,
        row.id,
      ]);
    }
    console.log(`  [${table}] "${current}" -> "${finalSlug}"`);
    changed++;
  }

  return changed;
}

async function main() {
  try {
    await dataSource.initialize();
    const seenSlugs = new Set<string>();

    console.log(
      `[fix-slugs] ${APPLY ? "APPLYING" : "DRY-RUN (no changes written; use --apply to commit)"}\n`,
    );

    let total = 0;
    for (const table of ["products", "categories", "brands", "departments"]) {
      const count = await fixTable(table, seenSlugs);
      console.log(`  ${table}: ${count} slug(s) need fixing`);
      total += count;
      console.log("");
    }

    console.log(`[fix-slugs] Total affected rows: ${total}`);
    await dataSource.destroy();
  } catch (error) {
    console.error("[fix-slugs] Failed:", error);
    process.exit(1);
  }
}

main();
