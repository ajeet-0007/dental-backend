import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHomepageCategoriesTable1753100000000 implements MigrationInterface {
  name = "CreateHomepageCategoriesTable1753100000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS homepage_categories (
        id INT AUTO_INCREMENT NOT NULL,
        categoryId INT NOT NULL,
        sortOrder INT NOT NULL DEFAULT 0,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_homepage_category_category (categoryId),
        INDEX idx_homepage_category_active_sort (isActive, sortOrder),
        CONSTRAINT fk_homepage_category_category FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS homepage_categories`);
  }
}
