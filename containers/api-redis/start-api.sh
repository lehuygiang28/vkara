#!/bin/sh
set -eu

export PORT="${PORT:-8000}"
export REDIS_HOST="${REDIS_HOST:-127.0.0.1}"
export REDIS_PORT="${REDIS_PORT:-6379}"
export REDIS_PASSWORD="${REDIS_PASSWORD:-giang}"
export NODE_ENV="${NODE_ENV:-production}"

if [ -n "${PLAYWRIGHT_PROXY_SERVER:-}" ]; then
    echo "API proxy: ${PLAYWRIGHT_PROXY_SERVER} (auth=$([ -n "${PLAYWRIGHT_PROXY_USERNAME:-}" ] && [ -n "${PLAYWRIGHT_PROXY_PASSWORD:-}" ] && echo yes || echo no))"
else
    echo "API proxy: not configured"
fi

if [ "${VKARA_TLS_INSECURE:-}" = "true" ] || [ "${VKARA_TLS_INSECURE:-}" = "1" ]; then
    echo "TLS verify: disabled (VKARA_TLS_INSECURE)"
fi

exec /app/server
