# Operator Controls and Acceptance

These controls belong to the follow-up review branch after published `7eba339`. They are not deployed publicly. Use [release evidence](RELEASE_7EBA339.md) for that immutable published revision and the follow-up evidence for the new implementation. No real mail, bucket upload, certificate issuance or external alert is performed by local tests.

## Database Identities

Use a **dedicated database/cluster**, not a shared tenant's schema. `dist/provision-roles.js` requires the owner URL, exact database-name confirmation and three independent random passwords (32+ characters). It serialises provisioning, refuses unexpected tables or inherited role memberships, retains business rows and moves application schema/table/enum ownership to `clientops_migrator`.

| Identity                 | Privileges                                                                         | Where used                                     |
| ------------------------ | ---------------------------------------------------------------------------------- | ---------------------------------------------- |
| Initial PostgreSQL owner | Cluster administration                                                             | One-shot provisioning and offline restore only |
| `clientops_migrator`     | Application schema ownership and database schema creation                          | Explicit migration/bootstrap jobs              |
| `clientops_runtime`      | Required DML only; no DDL, truncation, role membership or business-record deletion | API, mail worker and bounded maintenance       |
| `clientops_backup`       | Connect, schema usage and read-only tables/sequences                               | Logical backup and aggregate monitoring        |

Ticket history is append-only for runtime access. Runtime cannot write the bootstrap lock. New migration tables need explicit runtime grants in `runtime-grants.ts`; migrations reconcile them. The migrator requires database `CREATE` because Drizzle issues `CREATE SCHEMA IF NOT EXISTS`, even when its schema already exists. It has no cluster `CREATEDB`, `CREATEROLE` or superuser privilege. [PostgreSQL privileges](https://www.postgresql.org/docs/16/ddl-priv.html) distinguish ownership from granted access.

Production server startup rejects an elevated/non-runtime identity. Application role assignment and organisation scope remain enforced by Express; a shared runtime database role is **not** database row-level tenant isolation.

## First Setup and Updates

Prepare the private variables in `.env.production.example`; percent-encode passwords in connection URLs. Container URLs use `postgres:5432`. A host-side URL uses the actual bound host/port instead. No database port is published in production Compose.

```bash
# From the nested workspace, with private .env.production already configured.
dc() { docker compose -p clientops-production --env-file .env.production -f docker-compose.prod.yml "$@"; }
dc config --quiet
dc up -d --wait postgres
# First setup / privilege conversion only; stop API and any standalone mail workers first.
dc stop api
dc run --rm --no-deps provision
dc run --rm --no-deps migrate
read -r -p 'Administrator name: ' BOOTSTRAP_NAME
read -r -p 'Administrator email: ' BOOTSTRAP_EMAIL
read -r -s -p 'Unique passphrase: ' BOOTSTRAP_PASSWORD
export BOOTSTRAP_NAME BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
dc run --rm --no-deps -e BOOTSTRAP_NAME -e BOOTSTRAP_EMAIL -e BOOTSTRAP_PASSWORD bootstrap
unset BOOTSTRAP_NAME BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
dc up -d --no-build --wait api web nginx
```

Bootstrap is one-time and refuses an existing administrator. Do not overwrite accounts or seed a populated database. For later reviewed image updates: take/verify a backup, stop app/standalone workers for migrations, run `dc run --rm --no-deps migrate`, then start the pinned services and verify readiness/login. The API never receives migration/owner/backup credentials. Operator jobs and Docker administrators necessarily can access their injected credentials; restrict host/Docker access.

## Encrypted Backups and Schedules

`ops/Dockerfile` supplies PostgreSQL 16 clients, restic, curl and OpenSSL. It is a locally built operator image, not an automatically published application image. `docker-compose.operations.yml` mounts no Docker socket, drops capabilities and uses a read-only root filesystem. Scheduled jobs are host-owned systemd units.

Configure a **separate private off-host S3-compatible bucket**, HTTPS endpoint, bucket-scoped access keys, and `OPS_SECRETS_DIR` containing mode-600 `restic-password` and `alert-curl.conf`. Escrow the restic password separately; losing it makes the backup unrecoverable. Do not put these files in Git or CI artifacts. Production mode rejects a local repository path. A local Docker volume repository is used only for explicit disposable fixtures, so those tests do not prove cloud availability, bucket policy or disaster independence.

Backups stream `pg_dump` into restic with `--stdin-from-command`; a failed dump fails the backup rather than committing a silently truncated stream. The backup excludes session, recovery-token, outbox and rate-limit rows; user/business data and schema remain. Restore sanitisation is still mandatory. [Restic's command-stream guidance](https://restic.readthedocs.io/en/stable/040_backup.html#reading-data-from-a-command) explains this failure handling.

```bash
# Add operations variables to the same private Compose env file.
oc() { docker compose -p clientops-production --env-file .env.production -f docker-compose.prod.yml -f docker-compose.operations.yml "$@"; }
oc build operations
oc run --rm --no-deps operations init  # only for the deliberately chosen new repository
oc run --rm --no-deps operations backup
oc run --rm --no-deps operations check
```

Install on Ubuntu only after a successful manual backup and restore drill:

```bash
sudo install -d -m 700 /etc/clientops /usr/local/lib/clientops
sudo install -m 755 ops/scheduled.sh /usr/local/lib/clientops/scheduled.sh
# Create /etc/clientops/operations.env from ops/operations.env.example, mode 600.
# ENV_FILE must identify the fully configured private production/operations Compose env.
sudo install -m 644 ops/systemd/* /etc/systemd/system/
sudo systemd-analyze verify /etc/systemd/system/clientops-*.service /etc/systemd/system/clientops-*.timer
sudo systemctl daemon-reload
sudo systemctl enable --now clientops-backup.timer clientops-maintenance.timer clientops-monitor.timer clientops-check.timer clientops-prune.timer
systemctl list-timers 'clientops-*'
sudo systemctl start clientops-ops@backup.service
sudo journalctl -u clientops-ops@backup.service --since today
```

Schedules: daily 02:00 UTC backup; hourly bounded maintenance; five-minute monitoring; Sunday 04:00 complete encrypted-repository check and 06:00 retention. Retain seven daily, four weekly and six monthly snapshots scoped to host/tag `clientops`. Review those defaults against business retention requirements. Timers persist missed calendar jobs. Restic coordinates repository locking; overlapping prune/check/backup may fail safely and alert rather than disable locks. Do not use `--no-lock`.

## Failure Visibility

Status timestamps and failure markers live in `operations_state`, separate from business data. Monitoring verifies a trusted HTTPS database-readiness request, certificate lifetime (14-day warning by default), failed mail or pending/sending work older than ten minutes, a successful backup younger than 26 hours, and completed maintenance. Invalid timestamps and prior backup failures fail closed.

The local rehearsal deliberately tests database unavailability, backup connection failure, stale success markers, certificate-expiry threshold, failed email jobs and recovery. Webhook requests go only to an internal capture container. The private curl config supplies the real operator alert endpoint/auth in production. No recipients, reset links or tokens appear in alert payloads. Failed alert delivery exits nonzero and is visible in the unit journal. Both job-level notification and systemd `OnFailure` can notify, so duplicate alerts are possible.

This in-stack monitor cannot detect a dead VPS by itself. Before launch, configure an independent external HTTPS monitor and an off-host dead-man heartbeat for the backup timer. Verify an actual operator receives outage/backup/renewal alerts. A failed mail job must be investigated; do not delete evidence just to clear an alert. Terminal records are subject to documented 30-day retention. Security events remain redacted/bounded Docker logs; central access-controlled shipping and a tested 30-day retention policy are operator acceptance, not yet a hosted logging service.

## Restore and Rollback

`node scripts/verify-controls.mjs --followup` prepares the local encrypted repository. `node scripts/verify-restore.mjs --followup` takes a fresh encrypted backup, reads it back, restores to a **new uniquely named disposable database/volume**, sanitises sessions/links/outbox offline, provisions roles and applies migrations. It compares business fingerprints/relationships, login, tenant boundaries and source preservation. Private dump/config/key files stay under ignored/excluded `test-results/tls/`.

For a production incident, restore the selected restic snapshot to a private file on an isolated recovery host, create a new database and use `pg_restore --no-owner --no-acl --exit-on-error`. Never restore over the live database. Before connecting any application, run `dist/restore-sanitize.js` with the restore database owner URL, exact `RESTORE_CONFIRM_DATABASE` and `RESTORE_OFFLINE=true`; rotate session/mail secrets and provision roles. Validate counts, relationships, login and cross-organisation denial before DNS/traffic cutover. Maintain a monthly restore drill; `restic check` proves repository integrity, not application-level recovery. Do not accidentally send restored queued email.

Daily logical snapshots imply up to one backup interval of data loss after a failure (more if jobs failed). There is no WAL/PITR guarantee. Measured fixture timings are not production RTO; size, network and operator response matter.

The executable rollback command accepts only the recorded session-era digest pairs. Create a private full Compose JSON configuration with `docker compose ... config --format json` (mode 600, outside Git). Then:

```bash
node scripts/rollback.mjs --config=/etc/clientops/current-compose.json --confirm-project=clientops-production --target=7eba339
# Older emergency fallback, only after reviewing its capability loss:
node scripts/rollback.mjs --config=/etc/clientops/current-compose.json --confirm-project=clientops-production --target=bdc749 --acknowledge-account-pause=true
```

No schema downgrade occurs. Old `bdc749` has no outbox worker/readiness endpoint: account-changing routes are blocked at Nginx **before** the API is replaced, standalone workers stopped, container health uses **liveness only**, and `/api/health/ready` explicitly returns 503 rather than pretending database readiness. The gate matches Express's case-insensitive routes and rejects a directly published API port. Monitoring must continue reporting degraded capability. Login and ticket/comment work remain available and are rehearsed. Resume dispatch only after rolling forward. JWT-era images are rejected. The generated rollback JSON/nginx config is private; subsequent operations must use it until a deliberate roll-forward to the original pinned configuration. Unknown schema changes require a new rehearsal, not blind reuse of this allowlist.

## Trusted HTTPS and SMTP

Required operator inputs: domain/DNS, VPS access and pinned SSH fingerprint, production firewall policy, trusted certificate lineage, independent secrets, verified mail sender/SPF/DKIM/DMARC, authenticated TLS SMTP endpoint, private bucket/keys, external monitor/alert destination, key escrow and recovery owner.

For first certificate issuance, use Certbot DNS validation or standalone HTTP on port 80 **before** starting Nginx. After startup, the production Nginx configuration serves `/.well-known/acme-challenge/` from `ACME_WEBROOT_DIR`. Configure Certbot webroot renewal for that exact host directory. Install `ops/renew-certificate.sh` as a root-owned deploy hook; it checks expiry/key correspondence, installs the pair, validates Nginx and reloads. Run `certbot renew --dry-run`, then verify the public hostname/chain and operator alerts. [Certbot instructions](https://certbot.eff.org/instructions?ws=nginx&os=snap) are the source for host installation/renewal; issuance against a real domain has not been performed here.

The disposable helper renews a local certificate when fewer than 24 hours remain. Browser self-signed exceptions are restricted to loopback. Production has no certificate-verification bypass and rejects demo/test/capture-mail configurations. SMTP duplicate delivery remains possible if a worker crashes after SMTP acceptance but before recording success; retries preserve single-use tokens. Real SMTP/bounce/alert acceptance remains separate from Mailpit fixture evidence.
