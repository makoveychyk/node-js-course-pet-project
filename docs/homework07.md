# Homework 07 — GraphQL Orders + DataLoader

## Schema approach
- Chose the **code-first** mode so the schema is generated from the TypeScript decorators that already describe the domain. This keeps entities, DTOs, and GraphQL types in sync without maintaining separate `.graphql` files or duplicating enums such as `OrderStatus`.

## Schema & pagination contract
- GraphQL types live in `src/orders/orders.graphql-types.ts` and mirror the domain (`Order`, `OrderItem`, `Product`) with explicit nullability, `OrderStatus` enum, and nested `items → product` relations.
- Input types: `OrdersFilterInput` (`userId`, `status`, `dateFrom`, `dateTo`) and `OrdersPaginationInput` (`limit`, `offset`).
- Pagination strategy: kept a minimal `[Order!]!` response with offset pagination arguments because the REST service already exposes offset semantics and the UI only needs ordered lists, so a connection wrapper would add extra ceremony without delivering extra value right now.

## Resolvers & reuse of business logic
- `OrdersResolver` (`src/orders/orders.resolver.ts`) only normalizes/validates GraphQL arguments, then delegates to `OrdersService.listOrders`. No business logic (filtering, joins, batching) is duplicated.
- The resolver enforces limit (default 20, max 50), offset ≥ 0, and valid date ranges to provide immediate GraphQL validation errors.
- `OrderItemsResolver.product` resolves the nested product with DataLoader (see below), ensuring field resolvers stay thin as well.

## DataLoader & N+1 investigation
- DataLoader factory: `src/graphql/dataloaders/product.loader.ts` batches lookups via `ProductsService.findByIds` and caches within a single request.
- Context wiring: `src/graphql/graphql.module.ts` injects a fresh loader per GraphQL request and exposes it through `GraphqlContext`.
- Before adding the loader (with TypeORM `logging: true`), querying `orders { items { product { id title }}}` produced a select per order item, e.g.:
  ```
  query: SELECT ... FROM "order_items" WHERE "order_id" = $1
  query: SELECT ... FROM "products" WHERE "products"."id" = $1
  query: SELECT ... FROM "products" WHERE "products"."id" = $2
  ```
- After the loader change and toggling logging again, the same query emitted a single batched product fetch:
  ```
  query: SELECT ... FROM "products" WHERE "products"."id" IN ($1,$2,$3,$4)
  ```
  confirming the N+1 problem was removed.

## How to test
1. Start the NestJS app (`npm run start:dev`) and open `http://localhost:3000/graphql` (Apollo Sandbox/Playground).
2. Run a query such as:
   ```graphql
   query Orders($filter: OrdersFilterInput, $pagination: OrdersPaginationInput) {
     orders(filter: $filter, pagination: $pagination) {
       id
       status
       createdAt
       items {
         quantity
         priceSnapshot
         product {
           id
           title
           price
         }
       }
     }
   }
   ```
   with variables:
   ```json
   {
     "filter": { "status": "CREATED", "dateFrom": "2025-01-01T00:00:00.000Z" },
     "pagination": { "limit": 10, "offset": 0 }
   }
   ```
3. (Optional) Temporarily set `logging: true` inside the TypeORM config in `app.module.ts` to observe SQL batching before/after toggling the DataLoader.
