<p align="center">
  <a href="http://nestjs.com/" target="blank">
    <img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" />
  </a>
</p>

<p align="center">
  A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework
  for building efficient and scalable server-side applications.
</p>

<p align="center">
  <a href="https://www.npmjs.com/~nestjscore" target="_blank">
    <img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" />
  </a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank">
    <img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" />
  </a>
  <a href="https://www.npmjs.com/~nestjscore" target="_blank">
    <img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" />
  </a>
  <a href="https://circleci.com/gh/nestjs/nest" target="_blank">
    <img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" />
  </a>
</p>

# NodeJS/NestJS course pet project (Online Store)

## Description

This project is a backend API for a **future online store** as a pet project in frames of NodeJS/NestJs course from Robotdreams learning platform https://robotdreams.cc/uk, built using
[NestJS](https://nestjs.com/), a progressive Node.js framework for building
efficient, scalable server-side applications.

The project is initialized and structured strictly according to the **official
NestJS documentation**, with a strong focus on long-term scalability and clean
architecture.

Reference: https://docs.nestjs.com/first-steps

## Architectural Vision

The main architectural goal of this project is to create a **scalable,
maintainable and extensible backend foundation** for an online store.

From the very beginning, the architecture is designed to:

- support business growth without major refactoring
- keep domains isolated and independent
- follow clear separation of concerns
- align with NestJS core architectural principles

NestJS was chosen because it provides a well-defined application structure
out of the box, based on modules, dependency injection and explicit boundaries
between application layers.

Reference: https://docs.nestjs.com/architecture

## Project Architecture

The application follows a **modular architecture**, which is the core
architectural concept of NestJS.

> A module is a class annotated with a `@Module()` decorator.
> Modules organize the application structure and encapsulate related functionality.

Each business domain is implemented as a separate module, allowing the system
to scale horizontally as new features are added.

Reference: https://docs.nestjs.com/modules

## AppModule

`AppModule` is the **root module** of the application.

It acts as the main composition layer and is responsible for:

- importing domain-specific modules
- configuring global providers
- bootstrapping the application

This approach keeps the application entry point simple while allowing internal
modules to evolve independently.

Reference: https://docs.nestjs.com/modules#root-module

## UsersModule

`UsersModule` represents the **users domain**, which is a fundamental part of any
online store system.

This module encapsulates all user-related logic and follows NestJS best
practices:

- Controller handles HTTP requests and routing
- Service contains business logic
- Module defines clear boundaries for the domain

This separation makes the users domain easy to test, maintain and extend.

References:

- Controllers: https://docs.nestjs.com/controllers
- Providers: https://docs.nestjs.com/providers

## Configuration & Environment Variables

The project uses the official `@nestjs/config` package to manage environment
variables.

Configuration is environment-specific and handled via `.env` files such as:

- `.env.local`
- `.env.development`

Sensitive data is excluded from version control.  
A `.env.example` file is provided to document required environment variables.

This approach ensures flexibility across different environments while keeping
configuration secure and explicit.

Reference: https://docs.nestjs.com/techniques/configuration

## Scalability Considerations

The chosen architecture is designed to scale naturally as the project grows.

Future business domains are expected to be implemented as independent modules,
for example:

- ProductsModule
- OrdersModule
- AuthModule
- PaymentsModule

By following the same modular structure, new functionality can be added without
affecting existing domains.

Reference: https://docs.nestjs.com/architecture

## GraphQL Integration

GraphQL is powered by `@nestjs/graphql` with the Apollo driver and configured in `src/graphql/graphql.module.ts` to expose `/graphql` along with Apollo's landing page explorer. The project uses the **code-first** approach because the domain already relies on strongly typed entities and DTOs; generating the schema from decorators keeps the GraphQL contract aligned with TypeScript types, removes the need to manually sync `.graphql` files, and lets us reuse enums and validation logic from the existing modules without duplication. A minimal smoke query (`hello`) lives in `src/hello.resolver.ts`, so the landing page can be used immediately to verify the setup.

### Pagination format

The `orders` query intentionally returns a minimal `[Order!]!` list and relies on `limit/offset` arguments. The UI consumes offset-based pagination from the existing REST API, so reusing the same contract keeps both transports aligned and avoids building an unnecessary GraphQL connection wrapper until the product requires richer metadata (e.g., totalCount or cursors).

### N+1 investigation

To capture the classic N+1 footprint before adding DataLoader, I temporarily enabled `logging: true` for TypeORM in `src/app.module.ts` and ran the following query in Apollo Explorer:

```graphql
query {
  orders(pagination: { limit: 2 }) {
    id
    items {
      quantity
      product {
        id
        title
      }
    }
  }
}
```

The console printed sequential SQL statements such as:

```
query: SELECT ... FROM "order_items" WHERE "order_id" = $1
query: SELECT ... FROM "products" WHERE "products"."id" = $1
query: SELECT ... FROM "products" WHERE "products"."id" = $2
query: SELECT ... FROM "products" WHERE "products"."id" = $3
```

That meant every `OrderItem` triggered its own lookup against `products`. After wiring up `ProductLoaderFactory` and using `context.loaders.productById`, those lines disappeared and were replaced with a single IN query, proving the N+1 issue was removed.

**Before / after:** prior to DataLoader the same two orders produced `1 + N` queries to `products` (one per `OrderItem`). With DataLoader enabled, the logs show only one batched query `SELECT ... FROM "products" WHERE "products"."id" IN (...)`, confirming that product lookups are now grouped and cached within a GraphQL request.

## Project setup

```bash
$ npm install
```

## Compile and run the project

```bash
# development
$ npm run start

# watch mode
$ npm run start:dev

# production mode
$ npm run start:prod
```

## Run tests

## File storage flow

- **Integrated domain:** user avatar (`users/{userId}/avatars/...`).
- **Presign → Upload → Complete:**\
  1. `POST /files/presign` (`Authorization: Bearer <token>`) — backend verifies ownership from the JWT, generates the key/`FileRecord` with `pending` status, and returns `uploadUrl` for a direct `PUT` into S3.\
  2. Client performs `PUT uploadUrl` with the same `Content-Type`.\
  3. `POST /files/complete` — backend ensures the file belongs to the caller, flips the status to `ready`, and links it to `User.avatarFileId`.
- **Metadata:** the `file_records` table stores `ownerId`, `entityId`, `key`, `contentType`, `size`, `status`, `visibility`, and timestamps.
- **Access controls:** JWT scopes guard the endpoints (`files:write` for presign/complete, `files:read` for lookup); keys are server-generated, and ownership is enforced before any action.
- **Viewing URL:** if `CLOUDFRONT_BASE_URL` is set, the final URL uses it; otherwise a private S3 HTTPS link is returned.
- **Storage security:** the bucket stays non-public; uploads are only possible via presigned URLs with limited TTL, and attachments are restricted to the owner.
- **Authentication:** `POST /auth/login` (seed users use `password123`) returns a JWT; use `Authorization: Bearer <token>` for `/files/*` calls.

```bash
# unit tests
$ npm run test

# e2e tests
$ npm run test:e2e

# test coverage
$ npm run test:cov
```

## Deployment

When deploying to production, follow the official NestJS deployment guidelines: https://docs.nestjs.com/deployment

NestJS also provides Mau, an official platform for deploying applications to AWS:

```bash
$ npm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

- NestJS Documentation: https://docs.nestjs.com
- Discord: https://discord.gg/G7Qnnhy
- Official Courses: https://courses.nestjs.com
- Devtools: https://devtools.nestjs.com
- Enterprise Support: https://enterprise.nestjs.com
- Jobs: https://jobs.nestjs.com

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## License

## Homework 05 deliverables

- Transactional, idempotent `createOrder` implementation with pessimistic locking lives in `src/orders`.
- Oversell mitigation, concurrency notes, and SQL plans are documented under `docs/`.
- Detailed notes for the assignment are in `docs/homework05.md`.

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
