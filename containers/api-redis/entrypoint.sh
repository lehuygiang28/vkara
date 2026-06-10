#!/bin/sh
set -eu

# Supervisord expands %(ENV_PUBLIC_APP_URL)s at startup — the variable must exist first.
if [ -z "${PUBLIC_APP_URL:-}" ]; then
    if [ -n "${SPACE_HOST:-}" ]; then
        PUBLIC_APP_URL="https://${SPACE_HOST}"
    else
        PUBLIC_APP_URL="http://localhost:3000"
    fi
    export PUBLIC_APP_URL
fi

if [ -n "${SPACE_HOST:-}" ] && [ -z "${VKARA_TLS_INSECURE:-}" ]; then
    export VKARA_TLS_INSECURE=true
fi

if [ -n "${CF_PROXY_TUNNEL_HOSTNAME:-}" ]; then
    LOCAL="${CF_PROXY_TUNNEL_LOCAL_URL:-127.0.0.1:1080}"

    set -- access tcp --hostname "${CF_PROXY_TUNNEL_HOSTNAME}" --url "${LOCAL}"
    if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
        set -- "$@" \
            --service-token-id "${CF_ACCESS_CLIENT_ID}" \
            --service-token-secret "${CF_ACCESS_CLIENT_SECRET}"
    fi

    echo "Starting cloudflared proxy tunnel (${CF_PROXY_TUNNEL_HOSTNAME} -> ${LOCAL})"
    /usr/local/bin/cloudflared "$@" &
    CF_PID=$!

    if [ -z "${PLAYWRIGHT_PROXY_SERVER:-}" ]; then
        export PLAYWRIGHT_PROXY_SERVER="http://${LOCAL}"
    fi

    sleep 2

    if ! kill -0 "${CF_PID}" 2>/dev/null; then
        echo "cloudflared exited before the API could start" >&2
        exit 1
    fi
fi

exec /usr/bin/supervisord -c /app/supervisord.conf
