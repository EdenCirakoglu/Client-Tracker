#!/bin/sh
set -eu
umask 077
action=${1:?Choose init, backup, check, prune, monitor or notify}
case "$action" in init|backup|check|prune|monitor|notify) ;; *) exit 64 ;; esac
mkdir -p /state
export PGCONNECT_TIMEOUT=5
export PGOPTIONS='-c statement_timeout=300000'
export RESTIC_CACHE_DIR=/tmp/restic-cache
export RESTIC_PASSWORD_FILE=/run/secrets/restic-password
if [ "${OPS_MODE:-production}" = disposable ]; then
  case "${PGDATABASE:-}" in clientops_*_demo|clientops_*_test) ;; *) exit 64 ;; esac
else
  case "${RESTIC_REPOSITORY:-}" in s3:https://*) ;; *) echo 'An encrypted off-host HTTPS S3 repository is required.'; exit 64 ;; esac
  case "${MONITOR_ORIGIN:-}" in https://*) ;; *) exit 64 ;; esac
  [ "${CERT_MIN_SECONDS:-1209600}" -ge 604800 ] || exit 64
fi
notify() {
  # The secret curl config contains the destination/auth, never printed or interpolated into logs.
  [ -r /run/secrets/alert-curl.conf ] || return 1
  curl --config /run/secrets/alert-curl.conf --silent --fail --max-time 10 \
    --header 'Content-Type: application/json' \
    --data '{"text":"ClientOps operations check failed. Inspect the operator status files."}' \
    --output /dev/null 2>/dev/null
}
finished() {
  result=$?
  trap - EXIT
  if [ "$result" -ne 0 ]; then
    date +%s > "/state/$action.failed"
    echo "ClientOps $action failed. No payload or credentials logged."
    if [ "$action" != notify ]; then notify || echo 'Alert delivery failed; operator attention required.'; fi
  else
    date +%s > "/state/$action.ok.tmp"
    mv "/state/$action.ok.tmp" "/state/$action.ok"
    rm -f "/state/$action.failed"
  fi
  exit "$result"
}
trap finished EXIT
case "$action" in
  init) restic init >/dev/null 2>&1 ;;
  backup)
    # stdin-from-command rejects failed pg_dump instead of recording a truncated successful backup.
    restic backup --host clientops --tag clientops --stdin-filename clientops.dump \
      --stdin-from-command -- pg_dump --format=custom --no-owner --no-acl \
      --exclude-table-data=public.web_sessions --exclude-table-data=public.auth_sessions \
      --exclude-table-data=public.account_tokens --exclude-table-data=public.mail_outbox \
      --exclude-table-data=public.auth_rate_limits >/dev/null 2>&1
    ;;
  check) restic check --read-data >/dev/null 2>&1 ;;
  prune) restic forget --host clientops --tag clientops --keep-daily 7 --keep-weekly 4 --keep-monthly 6 --prune >/dev/null 2>&1 ;;
  notify) notify ;;
  monitor)
    # A trusted HTTPS request validates both hostname/chain and database readiness.
    if [ "${OPS_MODE:-production}" = disposable ]; then
      curl --silent --fail --max-time 5 --cacert /certs/cert.pem \
        --connect-to localhost:443:nginx:443 https://localhost/api/health/ready --output /dev/null 2>/dev/null
      certificate=/certs/cert.pem
    else
      curl --silent --fail --max-time 5 "${MONITOR_ORIGIN}/api/health/ready" --output /dev/null 2>/dev/null
      certificate=/certs/fullchain.pem
    fi
    openssl x509 -checkend "${CERT_MIN_SECONDS:-1209600}" -noout -in "$certificate" >/dev/null 2>&1
    mail=$(psql -XAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM mail_outbox WHERE status='FAILED' OR (status IN ('PENDING','SENDING') AND created_at < now()-interval '10 minutes')" 2>/dev/null)
    [ "$mail" = 0 ]
    for item in backup maintenance; do
      [ ! -f "/state/$item.failed" ]
      [ -r "/state/$item.ok" ]
      stamp=$(cat "/state/$item.ok")
      case "$stamp" in ''|*[!0-9]*) exit 1 ;; esac
      age=$(($(date +%s)-stamp))
      [ "$age" -ge 0 ] && [ "$age" -lt 93600 ]
    done
    ;;
esac
echo "ClientOps $action completed."
