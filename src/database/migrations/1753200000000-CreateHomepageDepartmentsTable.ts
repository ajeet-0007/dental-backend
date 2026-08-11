import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateHomepageDepartmentsTable1753200000000 implements MigrationInterface {
  name = "CreateHomepageDepartmentsTable1753200000000";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS homepage_departments (
        id INT AUTO_INCREMENT NOT NULL,
        departmentId INT NOT NULL,
        sortOrder INT NOT NULL DEFAULT 0,
        isActive TINYINT(1) NOT NULL DEFAULT 1,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_homepage_department_department (departmentId),
        INDEX idx_homepage_department_active_sort (isActive, sortOrder),
        CONSTRAINT fk_homepage_department_department FOREIGN KEY (departmentId) REFERENCES departments(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS homepage_departments`);
  }
}
