import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class IncreaseGatewayResponseLength1713000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      "payments",
      "gatewayResponse",
      new TableColumn({
        name: "gatewayResponse",
        type: "text",
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.changeColumn(
      "payments",
      "gatewayResponse",
      new TableColumn({
        name: "gatewayResponse",
        type: "varchar",
        length: "500",
        isNullable: true,
      }),
    );
  }
}