#!/bin/sh
set -eu
umask 077
# Root-owned configuration; deploy hook uses the same pinned state as scheduled jobs.
set -a
. /etc/clientops/operations.env
set +a
cd "${APP_DIR:?}"
exec node scripts/renew-certificate.mjs
