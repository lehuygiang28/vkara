# syntax=docker/dockerfile:1

FROM oven/bun:1.3.13-alpine AS base

WORKDIR /repo

COPY bun.lock package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/redis/package.json ./packages/redis/package.json
COPY packages/cache-redis/package.json ./packages/cache-redis/package.json
COPY packages/validators/package.json ./packages/validators/package.json
COPY packages/youtube/package.json ./packages/youtube/package.json
COPY packages/room/package.json ./packages/room/package.json
COPY packages/personalization/package.json ./packages/personalization/package.json
COPY packages/curated-playlists/package.json ./packages/curated-playlists/package.json

# Aio workspaces only (+ typescript for next build; lives in root devDeps today).
FROM base AS deps
RUN bun install --frozen-lockfile \
    --filter '@vkara/api' \
    --filter '@vkara/web' \
    --filter '@vkara/env' \
    --filter '@vkara/redis' \
    --filter '@vkara/cache-redis' \
    --filter '@vkara/validators' \
    --filter '@vkara/youtube' \
    --filter '@vkara/room' \
    --filter '@vkara/personalization' \
    --filter '@vkara/curated-playlists' \
    && bun add --dev typescript@5.7.3

FROM deps AS build-api
COPY apps/api ./apps/api
COPY packages/env ./packages/env
COPY packages/redis ./packages/redis
COPY packages/cache-redis ./packages/cache-redis
COPY packages/validators ./packages/validators
COPY packages/youtube ./packages/youtube
COPY packages/room ./packages/room

ENV NODE_ENV=production
RUN bun run --cwd apps/api build

FROM deps AS build-web
COPY apps/web ./apps/web
COPY packages/env ./packages/env
COPY packages/validators ./packages/validators
COPY packages/youtube ./packages/youtube
COPY packages/room ./packages/room
COPY packages/personalization ./packages/personalization
COPY packages/curated-playlists ./packages/curated-playlists

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
ENV PUBLIC_APP_URL=http://localhost:3000

EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
