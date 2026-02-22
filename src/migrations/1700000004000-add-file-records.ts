import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddFileRecords1700000004000 implements MigrationInterface {
  name = 'AddFileRecords1700000004000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "file_records_status_enum" AS ENUM ('pending', 'ready')`,
    );
    await queryRunner.query(
      `CREATE TYPE "file_records_visibility_enum" AS ENUM ('private', 'public')`,
    );

    await queryRunner.query(`
      CREATE TABLE "file_records" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "owner_id" uuid NOT NULL,
        "entity_id" uuid NULL,
        "entity_type" varchar(64) NOT NULL,
        "bucket" varchar(256) NOT NULL,
        "key" varchar(512) NOT NULL,
        "content_type" varchar(255) NOT NULL,
        "size" bigint NOT NULL DEFAULT 0,
        "status" "file_records_status_enum" NOT NULL DEFAULT 'pending',
        "visibility" "file_records_visibility_enum" NOT NULL DEFAULT 'private',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_file_records_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_file_records_owner_id" ON "file_records" ("owner_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_file_records_entity" ON "file_records" ("entity_type", "entity_id")`,
    );

    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN "avatar_file_id" uuid NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" ADD CONSTRAINT "FK_users_avatar_file" FOREIGN KEY ("avatar_file_id") REFERENCES "file_records"("id") ON DELETE SET NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "FK_users_avatar_file"`,
    );
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "avatar_file_id"`,
    );

    await queryRunner.query('DROP INDEX IF EXISTS "IDX_file_records_entity"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_file_records_owner_id"');
    await queryRunner.query('DROP TABLE IF EXISTS "file_records"');
    await queryRunner.query('DROP TYPE IF EXISTS "file_records_visibility_enum"');
    await queryRunner.query('DROP TYPE IF EXISTS "file_records_status_enum"');
  }
}
