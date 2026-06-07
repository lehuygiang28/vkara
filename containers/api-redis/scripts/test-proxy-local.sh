#!/usr/bin/env bash
# Test home gost proxy via Cloudflare Tunnel TCP (same flow as api-redis entrypoint).
# Usage:
#   export CF_PROXY_TUNNEL_HOSTNAME=vkara-prx-....giang.io.vn
#   export PLAYWRIGHT_PROXY_USERNAME=vkara
#   export PLAYWRIGHT_PROXY_PASSWORD=...
#   ./containers/api-redis/scripts/test-proxy-local.sh

set -euo pipefail

HOST="${CF_PROXY_TUNNEL_HOSTNAME:?set CF_PROXY_TUNNEL_HOSTNAME}"
LOCAL="${CF_PROXY_TUNNEL_LOCAL_URL:-127.0.0.1:1080}"
USER="${PLAYWRIGHT_PROXY_USERNAME:?set PLAYWRIGHT_PROXY_USERNAME}"
PASS="${PLAYWRIGHT_PROXY_PASSWORD:?set PLAYWRIGHT_PROXY_PASSWORD}"

ARCH="$(uname -m)"
case "${ARCH}" in
    x86_64) CF_ARCH=amd64 ;;
    aarch64|arm64) CF_ARCH=arm64 ;;
    *) echo "unsupported architecture: ${ARCH}" >&2; exit 1 ;;
esac

CF_BIN="${CF_BIN:-/tmp/cloudflared-linux-${CF_ARCH}}"
if [ ! -x "${CF_BIN}" ]; then
    wget -qO "${CF_BIN}" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"
    chmod +x "${CF_BIN}"
fi

pkill -f "cloudflared access tcp --hostname ${HOST}" 2>/dev/null || true
sleep 1

set -- access tcp --hostname "${HOST}" --url "${LOCAL}"
if [ -n "${CF_ACCESS_CLIENT_ID:-}" ] && [ -n "${CF_ACCESS_CLIENT_SECRET:-}" ]; then
    set -- "$@" --service-token-id "${CF_ACCESS_CLIENT_ID}" --service-token-secret "${CF_ACCESS_CLIENT_SECRET}"
fi

echo "Starting cloudflared (${HOST} -> ${LOCAL})"
"${CF_BIN}" "$@" &
CF_PID=$!
trap 'kill ${CF_PID} 2>/dev/null || true' EXIT

for i in $(seq 1 30); do
    if curl -sS --max-time 1 "http://${LOCAL}" >/dev/null 2>&1; then
        echo "Tunnel ready (${i}s)"
        break
    fi
    if ! kill -0 "${CF_PID}" 2>/dev/null; then
        echo "cloudflared exited" >&2
        exit 1
    fi
    sleep 1
done

PROXY="http://${USER}:${PASS}@${LOCAL}"

echo "--- ipify (outbound IP) ---"
curl -sS --max-time 20 -x "${PROXY}" https://api.ipify.org
echo

echo "--- tiktok HEAD ---"
curl -sS --max-time 20 -I -x "${PROXY}" https://www.tiktok.com | head -8

echo "OK"
