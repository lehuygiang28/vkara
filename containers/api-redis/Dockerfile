# syntax=docker/dockerfile:1

FROM oven/bun:1.3.13-alpine AS build

WORKDIR /repo

COPY bun.lock package.json turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/env/package.json ./packages/env/package.json
COPY packages/redis/package.json ./packages/redis/package.json
COPY packages/cache-redis/package.json ./packages/cache-redis/package.json
COPY packages/validators/package.json ./packages/validators/package.json
COPY packages/youtube/package.json ./packages/youtube/package.json
COPY packages/room/package.json ./packages/room/package.json
COPY packages/tiktok/package.json ./packages/tiktok/package.json
COPY packages/personalization/package.json ./packages/personalization/package.json
COPY packages/curated-playlists/package.json ./packages/curated-playlists/package.json

RUN bun install --frozen-lockfile \
    --filter '@vkara/api' \
    --filter '@vkara/env' \
    --filter '@vkara/redis' \
    --filter '@vkara/cache-redis' \
    --filter '@vkara/validators' \
    --filter '@vkara/youtube' \
    --filter '@vkara/room' \
    --filter '@vkara/tiktok'

COPY apps/api ./apps/api
COPY packages/env ./packages/env
COPY packages/redis ./packages/redis
COPY packages/cache-redis ./packages/cache-redis
COPY packages/validators ./packages/validators
COPY packages/youtube ./packages/youtube
COPY packages/room ./packages/room
COPY packages/tiktok ./packages/tiktok

ENV NODE_ENV=production

ARG TURBO_TEAM
ENV TURBO_TEAM=${TURBO_TEAM}

RUN --mount=type=secret,id=TURBO_TOKEN,required=false \
    TURBO_TOKEN=$(test -f /run/secrets/TURBO_TOKEN && cat /run/secrets/TURBO_TOKEN || true) \
    bunx turbo run build --filter='@vkara/api' --force

# Bun --compile marks playwright as external; copy runtime deps next to the binary.
RUN mkdir -p /runtime/node_modules && \
    cp -r /repo/node_modules/.bun/playwright@*/node_modules/playwright /runtime/node_modules/ && \
    cp -r /repo/node_modules/.bun/playwright-core@*/node_modules/playwright-core /runtime/node_modules/

FROM build AS production

LABEL git="https://github.com/lehuygiang28/vkara"
LABEL author="lehuygiang28 <lehuygiang28@gmail.com>"
LABEL org.opencontainers.image.maintainer="lehuygiang28 <lehuygiang28@gmail.com>"

WORKDIR /app

RUN mkdir -p /app && \
    chown bun:bun /app
COPY --chown=bun:bun --from=build /repo/apps/api/dist/server ./server
COPY --chown=bun:bun --from=build /runtime/node_modules ./node_modules
RUN chmod +x /app/server && \
    chown bun:bun /app/server

# System Chromium for Alpine (Playwright npm package stays external to the compiled binary).
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-emoji

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 \
    PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium-browser

RUN apk update && \
    apk add --no-cache supervisor redis

COPY --chown=bun:bun ./containers/api-redis/supervisord.conf ./supervisord.conf
COPY --chown=bun:bun ./containers/api-redis/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

RUN touch /app/supervisord.pid && \
    chown bun:bun /app/supervisord.pid && \
    touch /app/supervisord.log && \
    chown bun:bun /app/supervisord.log && \
    chmod 755 /app/supervisord.conf && \
    chmod 644 /app/supervisord.log && \
    chmod 644 /app/supervisord.pid

RUN mkdir -p ./log && \
    chown bun:bun ./log

RUN chown bun:bun /app

ENV NODE_ENV=production
ENV PUBLIC_APP_URL=http://localhost:3000

USER bun

ENTRYPOINT ["./entrypoint.sh"]

EXPOSE 8000
