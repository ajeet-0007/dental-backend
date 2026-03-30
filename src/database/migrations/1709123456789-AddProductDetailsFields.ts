import { MigrationInterface, QueryRunner } from "typeorm";

export class AddProductDetailsFields1709123456789 implements MigrationInterface {
    name = 'AddProductDetailsFields1709123456789'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`features\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`keySpecifications\` json NULL`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`packaging\` varchar(255) NULL`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`directionToUse\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`additionalInfo\` text NULL`);
        await queryRunner.query(`ALTER TABLE \`products\` ADD \`warranty\` varchar(255) NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`warranty\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`additionalInfo\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`directionToUse\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`packaging\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`keySpecifications\``);
        await queryRunner.query(`ALTER TABLE \`products\` DROP COLUMN \`features\``);
    }
}
