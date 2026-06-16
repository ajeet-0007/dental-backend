import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddProfessionalVerificationFields1720000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("users", [
      new TableColumn({ name: "dentalRegistrationId", type: "varchar", isNullable: true }),
      new TableColumn({ name: "stateDentalCouncil", type: "varchar", isNullable: true }),
      new TableColumn({ name: "registrationYear", type: "int", isNullable: true }),
      new TableColumn({ name: "qualification", type: "varchar", isNullable: true }),
      new TableColumn({ name: "collegeName", type: "varchar", isNullable: true }),
      new TableColumn({ name: "isProfessionalVerified", type: "tinyint", default: 0 }),
      new TableColumn({ name: "professionalVerifiedAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "verificationMethod", type: "varchar", isNullable: true }),
      new TableColumn({ name: "verificationAttempts", type: "int", default: 0 }),
      new TableColumn({ name: "verificationLastAttemptAt", type: "datetime", isNullable: true }),
      new TableColumn({ name: "verificationError", type: "varchar", isNullable: true }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumns("users", [
      "dentalRegistrationId",
      "stateDentalCouncil",
      "registrationYear",
      "qualification",
      "collegeName",
      "isProfessionalVerified",
      "professionalVerifiedAt",
      "verificationMethod",
      "verificationAttempts",
      "verificationLastAttemptAt",
      "verificationError",
    ]);
  }
}
