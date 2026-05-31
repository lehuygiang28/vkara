# syntax=docker/dockerfile:1

FROM oven/bun:1.3.13-alpine AS base

WORKDIR /repo

COPY bun.lock package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-infra/package.json ./packages/shared-infra/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json

# Aio workspaces only (+ typescript for next build; lives in root devDeps today).
FROM base AS deps
RUN bun install --frozen-lockfile \
    --filter '@vkara/api' \
    --filter '@vkara/web' \
    --filter '@vkara/shared-types' \
    --filter '@vkara/shared-infra' \
    --filter '@vkara/shared-utils' \
    && bun add --dev typescript@5.7.3

FROM deps AS build-api
COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-infra ./packages/shared-infra
COPY packages/shared-utils ./packages/shared-utils

ENV NODE_ENV=production
RUN bun run --cwd apps/api build

FROM deps AS build-web
COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils

ENV VKARA_AIO=1
ENV NEXT_PUBLIC_API_URL=/api/vkara
RUN bun run --cwd apps/web build

FROM caddy:2.10-alpine AS caddy
FROM redis:7-alpine AS redis

FROM oven/bun:1.3.13-alpine AS production

LABEL git="https://github.com/lehuygiang28/vkara"
LABEL author="lehuygiang28 <lehuygiang28@gmail.com>"
LABEL org.opencontainers.image.maintainer="lehuygiang28 <lehuygiang28@gmail.com>"

WORKDIR /app

RUN apk add --no-cache supervisor

COPY --from=caddy /usr/bin/caddy /usr/bin/caddy
COPY --from=redis /usr/local/bin/redis-server /usr/bin/redis-server

COPY --from=build-api /repo/apps/api/dist/server ./server
RUN chmod +x ./server

COPY --from=build-web /repo/apps/web/.next/standalone ./
COPY --from=build-web /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build-web /repo/apps/web/public ./apps/web/public

COPY ./containers/aio/Caddyfile ./Caddyfile
COPY ./containers/aio/supervisord.conf ./supervisord.conf
COPY ./containers/aio/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

ENV NODE_ENV=production
ENV PORT=3000
ENV VKARA_AIO=1

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
