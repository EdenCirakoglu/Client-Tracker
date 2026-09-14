#!/bin/sh
set -eu
umask 077
cd "${APP_DIR:?Set APP_DIR}"
compose() {
  docker compose --env-file "${ENV_FILE:?Set ENV_FILE}" -p "${COMPOSE_PROJECT_NAME:?Set project}" \
    -f docker-compose.prod.yml -f docker-compose.operations.yml "$@"
}
case "${1:-}" in
  maintenance)
    if compose run --rm --no-deps api node dist/maintenance.js; then
      compose run --rm --no-deps --entrypoint sh operations -c 'date +%s > /state/maintenance.ok; rm -f /state/maintenance.failed'
    else
      compose run --rm --no-deps --entrypoint sh operations -c 'date +%s > /state/maintenance.failed'
      exit 1
    fi ;;
  backup|check|prune|monitor|notify) compose run --rm --no-deps operations "$1" ;;
  *) echo 'Unsupported scheduled operation'; exit 64 ;;
esac
