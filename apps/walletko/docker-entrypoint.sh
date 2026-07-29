#!/bin/sh
set -e

node /app/migrate.mjs

exec "$@"
