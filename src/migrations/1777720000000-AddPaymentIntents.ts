import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaymentIntents1777719700000 implements MigrationInterface {
    name = "AddPaymentIntents1777719700000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "payment_intents" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "userId" character varying NOT NULL,
                "orderData" text NOT NULL,
                "used" boolean NOT NULL DEFAULT false,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_payment_intents_id" PRIMARY KEY ("id")
            )
        `);
        
        await queryRunner.query(`
            CREATE INDEX "IDX_payment_intents_userId" ON "payment_intents" ("userId")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP TABLE "payment_intents"`);
    }
}
