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

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).
