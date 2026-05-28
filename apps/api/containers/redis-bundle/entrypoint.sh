#!/bin/sh

# Start supervisord
exec /usr/bin/supervisord -c /app/supervisord.conf
