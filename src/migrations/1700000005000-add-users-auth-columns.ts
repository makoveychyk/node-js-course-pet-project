import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersAuthColumns1700000005000 implements MigrationInterface {
  name = 'AddUsersAuthColumns1700000005000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "password_hash" varchar(255) NULL'
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "roles" text[] NOT NULL DEFAULT ARRAY[]::text[]'
    );
    await queryRunner.query(
      'ALTER TABLE "users" ADD COLUMN "scopes" text[] NOT NULL DEFAULT ARRAY[]::text[]'
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "scopes"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "roles"');
    await queryRunner.query('ALTER TABLE "users" DROP COLUMN IF EXISTS "password_hash"');
  }
}
