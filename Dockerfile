# syntax=docker/dockerfile:1.7-labs
ARG NODE_VERSION=22.12.0

FROM node:${NODE_VERSION}-bookworm AS base
WORKDIR /usr/src/app
RUN npm install -g pnpm@9.12.3

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN --mount=type=cache,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm build

FROM deps AS dev
ENV NODE_ENV=development
COPY . .
EXPOSE 3000
CMD ["pnpm", "start:dev"]

FROM deps AS prod-deps
ENV NODE_ENV=production
RUN pnpm prune --prod

FROM base AS prod
ENV NODE_ENV=production
USER node
COPY --chown=node:node --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package.json ./package.json
COPY --chown=node:node --from=build /usr/src/app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/main.js"]

FROM gcr.io/distroless/nodejs20-debian12:nonroot AS prod-distroless
WORKDIR /usr/src/app
ENV NODE_ENV=production
COPY --from=prod-deps /usr/src/app/node_modules ./node_modules
COPY --from=build /usr/src/app/dist ./dist
COPY package.json ./package.json
EXPOSE 3000
CMD ["dist/main.js"]
