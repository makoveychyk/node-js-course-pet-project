import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStockPriceSnapshotIdempotency1700000002000 implements MigrationInterface {
  name = 'AddStockPriceSnapshotIdempotency1700000002000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE "products" ADD COLUMN "stock" int NOT NULL DEFAULT 0',
    );

    await queryRunner.query(
      'ALTER TABLE "order_items" RENAME COLUMN "price_at_purchase" TO "price_snapshot"',
    );

    await queryRunner.query(
      'ALTER TABLE "orders" ADD COLUMN "idempotency_key" varchar(120)',
    );

    await queryRunner.query(
      'CREATE UNIQUE INDEX "IDX_orders_idempotency_key" ON "orders" ("idempotency_key") WHERE "idempotency_key" IS NOT NULL',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX IF EXISTS "IDX_orders_idempotency_key"',
    );
    await queryRunner.query(
      'ALTER TABLE "orders" DROP COLUMN "idempotency_key"',
    );

    await queryRunner.query(
      'ALTER TABLE "order_items" RENAME COLUMN "price_snapshot" TO "price_at_purchase"',
    );

    await queryRunner.query('ALTER TABLE "products" DROP COLUMN "stock"');
  }
}
