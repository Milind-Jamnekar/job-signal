import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1783135056913 implements MigrationInterface {
  name = 'InitSchema1783135056913';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "jobs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" character varying NOT NULL, "company_id" uuid, "url" character varying NOT NULL, "url_hash" character varying NOT NULL, "source" character varying NOT NULL, "salary_min" integer, "salary_max" integer, "currency" character varying NOT NULL DEFAULT 'USD', "description" text, "posted_at" TIMESTAMP WITH TIME ZONE, "scraped_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), "freshness_score" integer NOT NULL, "status" character varying NOT NULL DEFAULT 'active', CONSTRAINT "UQ_9aff154c36c133be0cf9d64d767" UNIQUE ("url"), CONSTRAINT "UQ_e9fee32b88e4118784a56eed1c9" UNIQUE ("url_hash"), CONSTRAINT "PK_cf0a6c42b72fcc7f7c237def345" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_jobs_scraped_freshness" ON "jobs" ("scraped_at", "freshness_score") WHERE "status" = 'active'`,
    );
    await queryRunner.query(
      `CREATE TABLE "companies" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "salary_p50" integer, "headcount" integer, "last_enriched_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "UQ_3dacbb3eb4f095e29372ff8e131" UNIQUE ("name"), CONSTRAINT "PK_d4bc3e82a314fa9e29f652c2c22" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "job_outbox" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "job_id" uuid NOT NULL, "event_type" character varying NOT NULL DEFAULT 'enrich_company', "payload" jsonb, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "processed_at" TIMESTAMP WITH TIME ZONE, CONSTRAINT "PK_c3ba45dab51e3016acef18d0433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_job_outbox_unprocessed" ON "job_outbox" ("processed_at") WHERE "processed_at" IS NULL`,
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "password_hash" character varying NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE TABLE "saved_searches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "keywords" text array, "min_salary" integer, "min_freshness_score" integer NOT NULL DEFAULT '60', "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(), CONSTRAINT "PK_d9a53c71ccc5cf66dcdc5b33dfe" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_saved_searches_user_id" ON "saved_searches" ("user_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" ADD CONSTRAINT "FK_087a773c50525e348e26188e7cc" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_outbox" ADD CONSTRAINT "FK_485bc67ec1b6f9cea8df5c4ef57" FOREIGN KEY ("job_id") REFERENCES "jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "saved_searches" ADD CONSTRAINT "FK_8f01d13ac8e7b451d244674274f" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "saved_searches" DROP CONSTRAINT "FK_8f01d13ac8e7b451d244674274f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "job_outbox" DROP CONSTRAINT "FK_485bc67ec1b6f9cea8df5c4ef57"`,
    );
    await queryRunner.query(
      `ALTER TABLE "jobs" DROP CONSTRAINT "FK_087a773c50525e348e26188e7cc"`,
    );
    await queryRunner.query(`DROP TABLE "saved_searches"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TABLE "job_outbox"`);
    await queryRunner.query(`DROP TABLE "companies"`);
    await queryRunner.query(`DROP TABLE "jobs"`);
  }
}
