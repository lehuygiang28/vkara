FROM oven/bun:1.3.13 AS build

WORKDIR /repo

COPY bun.lock package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared-types/package.json ./packages/shared-types/package.json
COPY packages/shared-infra/package.json ./packages/shared-infra/package.json
COPY packages/shared-utils/package.json ./packages/shared-utils/package.json

RUN bun install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/shared-types ./packages/shared-types
COPY packages/shared-utils ./packages/shared-utils

ENV NODE_ENV=production

RUN bun run --cwd apps/web build

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
