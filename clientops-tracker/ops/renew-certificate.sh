#!/bin/sh
set -eu
umask 077
# Install as a Certbot deploy hook, with root-owned /etc/clientops/operations.env.
. /etc/clientops/operations.env
cd "${APP_DIR:?}"
compose() { docker compose --env-file "${ENV_FILE:?}" -p "${COMPOSE_PROJECT_NAME:?}" -f docker-compose.prod.yml "$@"; }
: "${RENEWED_LINEAGE:?Certbot supplies the successfully renewed lineage}"
: "${TLS_CERTS_DIR:?Set an absolute certificate directory in operations.env}"
case "$TLS_CERTS_DIR" in /*) ;; *) echo 'An absolute certificate directory is required'; exit 64 ;; esac
openssl x509 -checkend 604800 -noout -in "$RENEWED_LINEAGE/fullchain.pem" >/dev/null
cert_key=$(openssl x509 -in "$RENEWED_LINEAGE/fullchain.pem" -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256)
private_key=$(openssl pkey -in "$RENEWED_LINEAGE/privkey.pem" -pubout -outform DER | openssl dgst -sha256)
[ "$cert_key" = "$private_key" ]
install -m 600 "$RENEWED_LINEAGE/fullchain.pem" "$TLS_CERTS_DIR/fullchain.next.pem"
install -m 600 "$RENEWED_LINEAGE/privkey.pem" "$TLS_CERTS_DIR/privkey.next.pem"
cp "$TLS_CERTS_DIR/fullchain.pem" "$TLS_CERTS_DIR/fullchain.previous.pem"
cp "$TLS_CERTS_DIR/privkey.pem" "$TLS_CERTS_DIR/privkey.previous.pem"
mv "$TLS_CERTS_DIR/fullchain.next.pem" "$TLS_CERTS_DIR/fullchain.pem"
mv "$TLS_CERTS_DIR/privkey.next.pem" "$TLS_CERTS_DIR/privkey.pem"
if compose exec -T nginx nginx -t; then
  compose exec -T nginx nginx -s reload
else
  mv "$TLS_CERTS_DIR/fullchain.previous.pem" "$TLS_CERTS_DIR/fullchain.pem"
  mv "$TLS_CERTS_DIR/privkey.previous.pem" "$TLS_CERTS_DIR/privkey.pem"
  exit 1
fi
rm -f "$TLS_CERTS_DIR/fullchain.previous.pem" "$TLS_CERTS_DIR/privkey.previous.pem"
