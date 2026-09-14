# Production Operations Runbook

This is preparation, not a public deployment claim. PR #4 is merged as `7eba339`; its [revision-specific evidence](RELEASE_7EBA339.md) is preserved. The new [operator controls](OPERATOR_CONTROLS.md) provide restricted database roles, encrypted backup jobs, timers, monitoring and executable rollback on a separate draft branch. Production domain, hosting access, trusted certificate issuance, SMTP credentials, alert destination and backup storage remain operator inputs, not repository secrets.

## Health and Failure Behaviour

- `/health` and `/api/health`: process liveness, independent of PostgreSQL.
- `/health/ready` and `/api/health/ready`: a separate two-connection pool checks the users table, with 750ms connection/query limits. Returns 200 or a generic 503; no database address or error is exposed.
- Application queries have 2s acquisition/connect, 5s PostgreSQL statement and 6s client query limits. Authentication fails closed during an outage. Both idle and checked-out connection error events are handled; the process must survive PostgreSQL termination and recover.
- API container probes use readiness. Nginx liveness is only a local route check, not trusted TLS verification. Docker health status does not automatically restart an unhealthy process; alert on unhealthy state as well as process exit.
- Nginx re-resolves Docker service names every five seconds, with bounded connect/read timeouts, so replacement containers do not require permanent cached IP addresses. A brief 502 during replacement is possible; clients must retry safe reads, not blindly replay writes.

## Trusted HTTPS and Renewal

Use the deployment runbook's Ubuntu/firewall setup. Keep the listener loopback-bound until an operator has reviewed trusted TLS and account provisioning. `APP_ORIGIN` must be the exact HTTPS origin. PostgreSQL and the API must not have public host ports.

One supported operator path is Certbot standalone HTTP validation. Install Certbot using its [official instructions](https://certbot.eff.org/instructions); point the domain's A/AAAA records to this VPS and permit validation on port 80. Review the actual domain and email before executing:

```bash
# On the production host only, with Nginx stopped for initial HTTP validation.
sudo certbot certonly --standalone -d "$CLIENTOPS_DOMAIN" --email "$OPERATOR_EMAIL" --agree-tos
sudo install -d -m 700 /etc/clientops/tls
sudo install -m 644 "/etc/letsencrypt/live/$CLIENTOPS_DOMAIN/fullchain.pem" /etc/clientops/tls/fullchain.pem
sudo install -m 600 "/etc/letsencrypt/live/$CLIENTOPS_DOMAIN/privkey.pem" /etc/clientops/tls/privkey.pem
```

Set `TLS_CERTS_DIR=/etc/clientops/tls`. The copied files avoid mounting broken symlinks from Certbot's `live` directory. Configure a **root-owned** renewal deploy hook to atomically install the renewed files from `$RENEWED_LINEAGE` into that directory, run `dc exec -T nginx nginx -t`, then `dc exec -T nginx nginx -s reload`. Here `dc` must be an explicit absolute-path Compose command, not an interactive shell alias. The renewal hook must verify its lineage/domain allowlist before copying. Use a webroot/DNS challenge for uninterrupted renewal, or documented pre/post hooks to stop/start Nginx for standalone validation. Never mount the Docker socket inside a public-facing container.

Check `systemctl list-timers` for the installed Certbot renewal timer, run `sudo certbot renew --dry-run`, and test the reviewed deploy hook on staging. External acceptance must use `curl --fail https://$CLIENTOPS_DOMAIN/api/health/ready` **without** `-k`, and inspect expiry/chain from another network. Alert at 21/7 days before expiry. No trusted issuance, renewal timer or public HTTPS check has been performed by this review.

The local helper checks `openssl x509 -checkend 86400` and regenerates its seven-day loopback certificate when missing or within 24 hours of expiry. Self-signed local acceptance is not evidence of public trust. Recreate/reload the isolated Nginx after renewal.

## Secrets, Accounts and Mail

Generate independent cryptographic secrets for PostgreSQL, `SESSION_SECRET` and the 32-byte hex `MAIL_ENCRYPTION_KEY`. Store them outside Git in an operator-controlled secret store; Compose env files must have restrictive OS permissions. Do not print resolved production Compose configuration in CI. Rotate session secrets on a restore; invalidate restored sessions and account links before any worker or API starts.

Normal production rejects demo login, disposable database configuration, capture SMTP, missing mail keys, obvious placeholder/low-diversity keys and non-HTTPS origins. `DEPLOYMENT_MODE=disposable` is explicitly restricted to designated disposable databases, loopback HTTPS and Mailpit. Do not set it on a public host. No seed runs at application startup.

Bootstrap a real administrator once using the private command in [session setup](SESSION_HARDENING.md), then use administrator invitations. Production mail requires authenticated SMTP with certificate-verified implicit TLS or STARTTLS, verified sender ownership and SPF/DKIM/DMARC. Configure bounces and quota monitoring with the mail provider. Local verification sends fictional addresses only to Mailpit. See [durable delivery](MAIL_DELIVERY.md) for retry, encryption and duplicate-delivery semantics.

The PostgreSQL owner is a privileged initialisation identity. Use the [provisioning command](OPERATOR_CONTROLS.md#database-identities) to establish separate runtime, migration and backup roles. Runtime privilege denials are tested in the new disposable fixture; staging conversion still requires the operator's private credentials and exact database confirmation. Never expose the initialisation owner URL to the long-running API.

## Monitoring, Alerts and Retention

Configure an external monitor every 60 seconds for HTTPS readiness and a separate liveness check. Suggested initial policies: page the operator on two consecutive readiness failures, repeated 5xx responses, disk below 20%, failed backups, or certificate expiry below seven days. Confirm each alert reaches a named operator by deliberately failing a staging check. Thresholds are starting policies, not measured service objectives.

The administrator Accounts page and `GET /api/users/deliveries` show full outbox status counts and the latest 30 redacted jobs. Alert on terminal FAILED jobs, pending work older than five minutes, repeated worker-unavailable events and SMTP quota exhaustion. Do not scrape this endpoint with a demo or unlimited-lifetime administrator session; use an operator SQL monitor or design a separately scoped monitoring credential before automating privileged inspection.

API logs contain structured `security_request` outcomes for login, logout, recovery, invitation acceptance, password changes and account-access changes; they record time, action, HTTP status and the authenticated actor ID when present. A successful recovery-request event means generic acknowledgement, not proof that an account exists. Neither request URLs, body, headers, IP, email nor raw transport errors are recorded. Nginx logs method/status/upstream status/duration without URLs or referrers; request-context error logs are suppressed. This deliberately trades detailed proxy error text for lower disclosure risk.

Production Compose uses Docker's local rotating log driver, 3 x 10MB per service. This bounds disk use, **not** a guaranteed number of days. Forward security outcomes to restricted off-host storage with an operator-approved retention (initial target: 30 days), access audit and deletion policy. The stream is not a tamper-proof audit database. No external monitoring, alert delivery or log archive has been provisioned.

Run one bounded retention batch daily, repeat if backlog remains, and monitor failures:

```bash
dc run --rm --no-deps api node dist/maintenance.js
```

This deletes at most 500 rows per operational table per run: terminal mail and expired account/session grants older than 30 days, expired browser sessions and expired rate limits. It does not delete business records or active account links. Backups and external logs need separate retention.

## Backup and Recovery

Take encrypted, access-controlled off-host backups on an operator-approved schedule, retain multiple generations, alert on failures and perform periodic restore drills. Password hashes and business data make a dump sensitive even when live credentials are excluded. The current logical dump is not WAL/PITR: expected data loss is writes after its snapshot, up to the backup interval plus any failed-backup delay. A local small-fixture timing is not a production RTO guarantee.

From the production workspace with reviewed `dc` and private backup directory:

```bash
umask 077
dc exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl --exclude-table-data=public.web_sessions --exclude-table-data=public.auth_sessions --exclude-table-data=public.account_tokens --exclude-table-data=public.mail_outbox --exclude-table-data=public.auth_rate_limits' > "$BACKUP_FILE"
```

Encrypt/upload via the chosen backup provider; verify checksum and decryptability on a separate machine. The repository does not choose or provision that provider.

Restore into a **new, empty database/volume**, with no API, workers or Studio connected. Do not import a backup from an untrusted source. Run `pg_restore --no-owner --no-acl --exit-on-error` against that new database, then the reviewed migration command. Before exposing it, use the new image's offline command:

```bash
# Restore Compose/environment must point ONLY to the new database.
dc run --rm --no-deps migrate
dc run --rm --no-deps -e RESTORE_CONFIRM_DATABASE="$RESTORED_DATABASE" -e RESTORE_OFFLINE=true api node dist/restore-sanitize.js
```

Sanitisation requires an exact database-name confirmation and refuses other connected clients. It deletes all restored session grants, browser sessions, invitation/reset tokens, mail jobs and rate limits, and increments each user's auth version. Business records/password hashes remain intact. Keep network access blocked throughout; the confirmation is not a substitute for firewall isolation. Rotate session and mail keys, verify relationships, login and organisation boundaries, then invite pending users again and request new recovery links as needed.

Rollback only to a migration-compatible **session-era** image pair pinned by digest. Stop dispatchers first; retain the additive schema. `bdc7494` is the rehearsed fallback, but it has synchronous email and no DB-readiness endpoint. A rollback therefore requires a reviewed health-probe override and suspending account-delivery actions; pending outbox work waits for roll-forward. It is not a fully equivalent production fallback. Never roll back to the pre-session JWT release or undo migrations blindly.

References: [PostgreSQL dump](https://www.postgresql.org/docs/16/app-pgdump.html), [restore](https://www.postgresql.org/docs/16/app-pgrestore.html), [Certbot renewal hooks](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates).
