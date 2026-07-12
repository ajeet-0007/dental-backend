import { MigrationInterface, QueryRunner } from "typeorm";

export class AddOtpAndEmailVerification1780000000000 implements MigrationInterface {
    name = "AddOtpAndEmailVerification1780000000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "otps" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "email" character varying NOT NULL,
                "code" character varying NOT NULL,
                "type" character varying NOT NULL,
                "expiresAt" TIMESTAMP NOT NULL,
                "attempts" integer NOT NULL DEFAULT 0,
                "isUsed" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_otps_id" PRIMARY KEY ("id")
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_otps_email_type" ON "otps" ("email", "type")
        `);

        await queryRunner.query(`
            ALTER TABLE "users" ADD "isEmailVerified" boolean NOT NULL DEFAULT false
        `);

        await queryRunner.query(`
            ALTER TABLE "users" ADD "emailVerifiedAt" TIMESTAMP
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "emailVerifiedAt"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "isEmailVerified"`);
        await queryRunner.query(`DROP INDEX "IDX_otps_email_type"`);
        await queryRunner.query(`DROP TABLE "otps"`);
    }
}
