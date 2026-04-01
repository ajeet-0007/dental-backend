import { MigrationInterface, QueryRunner } from "typeorm";

export class AddAddressLatLong1709200000000 implements MigrationInterface {
    name = 'AddAddressLatLong1709200000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`latitude\` decimal(10,7) NULL`);
        await queryRunner.query(`ALTER TABLE \`addresses\` ADD \`longitude\` decimal(10,7) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`longitude\``);
        await queryRunner.query(`ALTER TABLE \`addresses\` DROP COLUMN \`latitude\``);
    }
}
