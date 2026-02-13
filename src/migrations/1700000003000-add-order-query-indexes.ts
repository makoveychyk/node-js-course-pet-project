import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOrderQueryIndexes1700000003000 implements MigrationInterface {
  name = 'AddOrderQueryIndexes1700000003000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE INDEX "IDX_orders_user_created" ON "orders" ("user_id", "created_at" DESC)',
    );
    await queryRunner.query(
      'CREATE INDEX "IDX_orders_status_created" ON "orders" ("status", "created_at" DESC)',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_orders_status_created"');
    await queryRunner.query('DROP INDEX IF EXISTS "IDX_orders_user_created"');
  }
}
