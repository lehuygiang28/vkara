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

exec /usr/bin/supervisord -c /app/supervisord.conf
