# SQL optimization notes

## Query under test

```
SELECT o.id,
       o.user_id,
       o.status,
       o.created_at,
       oi.product_id,
       oi.quantity
FROM orders o
LEFT JOIN order_items oi ON oi.order_id = o.id
WHERE o.user_id = '00000000-0000-0000-0000-000000000000'
  AND o.status = 'CREATED'
  AND o.created_at >= '2026-01-01'
  AND o.created_at <= '2026-02-01'
ORDER BY o.created_at DESC
LIMIT 20 OFFSET 0;
```

Captured with `scripts/explain-before.sql` / `scripts/explain-after.sql`.

## Plan before indexes

```
Limit  (cost=1543.12..1543.17 rows=20 width=104) (actual time=38.212..38.231 rows=20 loops=1)
  Buffers: shared hit=12 read=342
  ->  Sort  (cost=1543.12..1568.12 rows=10000 width=104) (actual time=38.210..38.219 rows=20 loops=1)
        Sort Key: o.created_at DESC
        Buffers: shared hit=12 read=342
        ->  Hash Join  (cost=412.00..1181.12 rows=10000 width=104) (actual time=11.832..33.942 rows=20000 loops=1)
              Hash Cond: (oi.order_id = o.id)
              Buffers: shared hit=12 read=342
              ->  Seq Scan on order_items oi  (cost=0.00..512.00 rows=24000 width=48) (actual time=0.010..11.132 rows=24000 loops=1)
                    Buffers: shared read=210
              ->  Hash  (cost=362.00..362.00 rows=4000 width=72) (actual time=11.771..11.773 rows=4000 loops=1)
                    Buckets: 4096  Batches: 1  Memory Usage: 256kB
                    Buffers: shared read=132
                    ->  Seq Scan on orders o  (cost=0.00..362.00 rows=4000 width=72) (actual time=0.008..9.472 rows=4000 loops=1)
                          Filter: ((user_id = '00000000-0000-0000-0000-000000000000'::uuid) AND (status = 'CREATED'::orders_status_enum) AND (created_at >= '2026-01-01 00:00:00+00'::timestamptz) AND (created_at <= '2026-02-01 00:00:00+00'::timestamptz))
                          Rows Removed by Filter: 6000
```

## Plan after indexes

```
Limit  (cost=1.05..46.11 rows=20 width=104) (actual time=0.403..2.486 rows=20 loops=1)
  Buffers: shared hit=188
  ->  Nested Loop  (cost=1.05..2308.24 rows=1000 width=104) (actual time=0.401..2.473 rows=20 loops=1)
        Buffers: shared hit=188
        ->  Index Scan using "IDX_orders_user_created" on orders o  (cost=0.42..78.42 rows=1000 width=72) (actual time=0.097..0.654 rows=20 loops=1)
              Index Cond: ((user_id = '00000000-0000-0000-0000-000000000000'::uuid) AND (created_at >= '2026-01-01 00:00:00+00'::timestamptz) AND (created_at <= '2026-02-01 00:00:00+00'::timestamptz))
              Filter: (status = 'CREATED'::orders_status_enum)
              Buffers: shared hit=28
        ->  Bitmap Heap Scan on order_items oi  (cost=0.63..2.22 rows=1 width=48) (actual time=0.071..0.074 rows=1 loops=20)
              Recheck Cond: (order_id = o.id)
              Heap Blocks: exact=40
              Buffers: shared hit=160
              ->  Bitmap Index Scan on "IDX_order_items_order_id"  (cost=0.00..0.63 rows=1 width=0) (actual time=0.019..0.019 rows=1 loops=20)
                    Index Cond: (order_id = o.id)
                    Buffers: shared hit=40
```

## Summary

- Added `IDX_orders_user_created (user_id, created_at DESC)` and `IDX_orders_status_created (status, created_at DESC)` in migration `1700000003000-add-order-query-indexes.ts`.
- Planner switches from sequential scans + hash join to targeted index scans, dropping execution time from ~38ms to ~2.5ms on the seeded dataset and eliminating 300+ buffer reads.
- Order-items access leverages the existing `IDX_order_items_order_id` bitmap index to avoid scanning unrelated items.
