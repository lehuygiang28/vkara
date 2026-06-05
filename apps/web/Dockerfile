# syntax=docker/dockerfile:1

FROM oven/bun:1.3.13 AS build

WORKDIR /repo

COPY bun.lock package.json turbo.json eslint.config.mjs ./
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

RUN bun install --frozen-lockfile \
    --filter '@vkara/web' \
    --filter '@vkara/env' \
    --filter '@vkara/validators' \
    --filter '@vkara/youtube' \
    --filter '@vkara/room' \
    --filter '@vkara/personalization' \
    --filter '@vkara/curated-playlists' \
    && bun add --dev typescript@5.7.3

COPY apps/web ./apps/web
COPY packages/env ./packages/env
COPY packages/validators ./packages/validators
COPY packages/youtube ./packages/youtube
COPY packages/room ./packages/room
COPY packages/personalization ./packages/personalization
COPY packages/curated-playlists ./packages/curated-playlists

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_WS_URL
ARG NEXT_PUBLIC_APP_URL
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXT_PUBLIC_WS_URL=${NEXT_PUBLIC_WS_URL}
ENV NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL}

ARG TURBO_TEAM
ENV TURBO_TEAM=${TURBO_TEAM}

RUN --mount=type=secret,id=TURBO_TOKEN,required=false \
    TURBO_TOKEN=$(test -f /run/secrets/TURBO_TOKEN && cat /run/secrets/TURBO_TOKEN || true) \
    bunx turbo run build --filter='@vkara/web'

FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --from=build /repo/apps/web/.next/standalone ./
COPY --from=build /repo/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /repo/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
