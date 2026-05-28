FROM oven/bun:1.3.13 AS build

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

FROM gcr.io/distroless/base AS production

LABEL git="https://github.com/lehuygiang28/vkara"
LABEL author="lehuygiang28 <lehuygiang28@gmail.com>"
LABEL org.opencontainers.image.maintainer="lehuygiang28 <lehuygiang28@gmail.com>"

WORKDIR /app

COPY --from=build /repo/apps/api/dist/server ./server

ENV NODE_ENV=production

CMD ["./server"]

EXPOSE 8000
