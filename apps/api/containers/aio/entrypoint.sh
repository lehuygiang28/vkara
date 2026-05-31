#!/bin/sh

export PUBLIC_APP_URL="${PUBLIC_APP_URL:-http://localhost:3000}"

exec /usr/bin/supervisord -c /app/supervisord.conf
