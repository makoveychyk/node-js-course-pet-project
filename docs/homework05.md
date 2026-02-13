# Homework 05 summary

## Transactional createOrder
- `OrdersService.createOrder` now uses an explicit `QueryRunner` so stock checks, inventory updates, order insert and item insertions live in one transaction with `commit` / `rollback` / `release` guarantees.
- Any thrown error rolls back the transaction; success fetches the hydrated order (user + items) after commit to avoid partial writes.

## Oversell & concurrency control
- Products participating in the order are locked with `FOR NO KEY UPDATE`, preventing concurrent stock deductions from reading stale quantities.
- Stock validation happens under the lock; insufficient inventory triggers a `409 Conflict` (`ConflictException`), while invalid quantities surface as `400 Bad Request`.

## Idempotency workflow
- API accepts `idempotencyKey` in the JSON payload or the `Idempotency-Key` header; the body value wins if both are supplied.
- The `orders.idempotency_key` column has a partial unique index; duplicate submissions return the previously created order (200/201) instead of writing again.
- Business errors (stock, validation) are rethrown after rollback; unexpected errors propagate as 500-level responses.

## SQL optimization deliverables
- Optimized the user/status/date-filtered orders listing query (see `scripts/explain-before.sql` / `scripts/explain-after.sql`).
- Added `IDX_orders_user_created` and `IDX_orders_status_created` to steer the planner toward index scans; plans and metrics recorded in `docs/sql-optimization.md`.
- Net result: the query switched from sequential scans + hash join (~38ms, 342 buffer reads) to index-driven nested loops (~2.5ms, 188 buffer reads) on the seeded dataset.
