import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class RemoveVerificationFields1721000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns("users", [
      "registrationYear",
      "qualification",
      "collegeName",
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("users", [
      new TableColumn({ name: "registrationYear", type: "int", isNullable: true }),
      new TableColumn({ name: "qualification", type: "varchar", isNullable: true }),
      new TableColumn({ name: "collegeName", type: "varchar", isNullable: true }),
    ]);
  }
}
