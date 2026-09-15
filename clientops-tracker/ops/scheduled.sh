#!/bin/sh
set -eu
umask 077
cd "${APP_DIR:?Set APP_DIR}"
: "${DEPLOYMENT_STATE_DIR:?Set the stable private deployment state directory}"
case "$DEPLOYMENT_STATE_DIR" in /*) ;; *) exit 64 ;; esac
mkdir -p "$DEPLOYMENT_STATE_DIR"
# Deployment uses the same atomic directory lock. Never expire or steal a live lock.
case "${1:-}" in
  maintenance|backup|check|prune)
    mkdir "$DEPLOYMENT_STATE_DIR/lock" || { echo 'Deployment/maintenance is already running'; exit 75; }
    trap 'rmdir "$DEPLOYMENT_STATE_DIR/lock"' EXIT
    [ ! -f "$DEPLOYMENT_STATE_DIR/blocked.json" ] || { echo 'Deployment recovery review is required'; exit 75; }
    ;;
esac
compose() {
  # Use the exact configuration which passed deployment, never a moving tag or checkout.
  docker compose -p "${COMPOSE_PROJECT_NAME:?Set project}" -f "$DEPLOYMENT_STATE_DIR/current.json" "$@"
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
