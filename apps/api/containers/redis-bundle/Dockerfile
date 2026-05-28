FROM oven/bun:1.3.13-alpine AS build

WORKDIR /repo

COPY bun.lock package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-infra/package.json ./packages/shared-infra/package.json

RUN bun install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-infra ./packages/shared-infra

ENV NODE_ENV=production

RUN bun run --cwd apps/api build

FROM build AS production

LABEL git="https://github.com/lehuygiang28/vkara"
LABEL author="lehuygiang28 <lehuygiang28@gmail.com>"
LABEL org.opencontainers.image.maintainer="lehuygiang28 <lehuygiang28@gmail.com>"

WORKDIR /app

RUN mkdir -p /app && \
    chown bun:bun /app
COPY --chown=bun:bun --from=build /repo/apps/api/dist/server ./server
RUN chmod +x /app/server && \
    chown bun:bun /app/server

RUN apk update && \
    apk add --no-cache supervisor redis

COPY --chown=bun:bun ./apps/api/containers/redis-bundle/supervisord.conf ./supervisord.conf
COPY --chown=bun:bun ./apps/api/containers/redis-bundle/entrypoint.sh ./entrypoint.sh
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

USER bun

ENTRYPOINT ["./entrypoint.sh"]

EXPOSE 8000
