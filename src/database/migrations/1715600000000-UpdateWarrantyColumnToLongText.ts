import { MigrationInterface, QueryRunner } from "typeorm";

export class UpdateWarrantyColumnToLongText1715600000000 implements MigrationInterface {
    name = 'UpdateWarrantyColumnToLongText1715600000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE products MODIFY warranty LONGTEXT`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE products MODIFY warranty TEXT`);
    }
}
