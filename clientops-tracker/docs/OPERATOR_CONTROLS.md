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

All installations and updates use **`scripts/deploy.mjs`**, the same executable used
by the manual SSH workflow. It resolves application tags to registry digests, checks
their OCI revision labels and never rebuilds application images. Its separately built
operator image carries the same reviewed source SHA and is pinned by local image ID
in a mode-600 rendered Compose file. Nginx configuration is copied into that release
directory so later Git checkouts cannot silently change a running release's config.

Prerequisites: clean checkout of the reviewed SHA, Node 24, Docker Compose, OpenSSL,
private production env, trusted certificate files, authenticated SMTP, configured
encrypted repository/alert secrets and sufficient disk. Run as the same host owner
used by scheduled jobs; Docker access is root-equivalent. Use a dedicated cluster.
Stop any external SQL writers and manually managed workers first. The runner refuses
unknown project jobs and checks database quiescence after stopping API/web/Nginx and
all project `worker`/`mail-worker` replicas, including API one-off containers.

Keep `/etc/clientops` root-owned mode 750 with the deployment user's private group;
give that user ownership of `deployment/` (700) and its production env file (600).
Root-owned timers/hooks can read these; no other login should share the group.
Keep TLS private keys, `operations.env` and backup secrets root-owned as described below.
An update rejects changes to the recorded database identity, storage or PostgreSQL
image. PostgreSQL upgrades need a separate reviewed procedure.

```bash
# From a clean checkout of the reviewed SHA, inside clientops-tracker/.
export RELEASE_SHA=REVIEWED_FULL_MAIN_SHA
export STATE_DIR=/etc/clientops/deployment
export CONFIG="$STATE_DIR/releases/$RELEASE_SHA/compose.json"
umask 077
node scripts/deploy.mjs prepare --env=/etc/clientops/production.env --config="$CONFIG" --project=clientops-production --revision="$RELEASE_SHA"
dc() { docker compose -p clientops-production -f "$CONFIG" "$@"; }
# First repository setup ONLY. Existing repositories must not be re-initialised.
dc run --rm --no-deps operations init
dc run --rm --no-deps operations check
```

Choose exactly one installation/update mode:

| Mode      | Preconditions and sequence                                                                                                                                                                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install` | Public schema must be empty. Explicit exact-name provisioning approval; provision roles, migrate, verify runtime privileges, start app/proxy and check trusted readiness. No pre-install backup is claimed for an empty database.                                                                       |
| `convert` | Populated published `7eba339` owner-based database. Stop writers, take an encrypted backup using the owner **only in the one-shot backup job**, read/check the repository, explicitly provision roles, migrate, verify runtime role, start and verify readiness. Owner credentials never enter the API. |
| `update`  | Restricted roles and repository already work. Stop writers, encrypted read-only-role backup and full read-data check, migrate with the separate migrator, runtime-role check, startup and trusted readiness. It never provisions roles.                                                                 |

```bash
# New installation. Substitute the EXACT POSTGRES_DB; it is a confirmation, not a default.
node scripts/deploy.mjs apply --config="$CONFIG" --project=clientops-production --revision="$RELEASE_SHA" --state-dir="$STATE_DIR" --mode=install --allow-provision=EXACT_DATABASE_NAME
# OR: populated 7eba339 conversion, preserving users and business data.
node scripts/deploy.mjs apply --config="$CONFIG" --project=clientops-production --revision="$RELEASE_SHA" --state-dir="$STATE_DIR" --mode=convert --allow-provision=EXACT_DATABASE_NAME
# OR: later update, also the ONLY mode allowed by deploy.yml.
node scripts/deploy.mjs apply --config="$CONFIG" --project=clientops-production --revision="$RELEASE_SHA" --state-dir="$STATE_DIR" --mode=update
```

Only after a successful **new installation**, bootstrap through the dedicated
migration-credential job. Keep the firewall private until bootstrap and staging
acceptance finish. Conversion/update must not bootstrap, seed or overwrite accounts.

```bash
read -r -p 'Administrator name: ' BOOTSTRAP_NAME
read -r -p 'Administrator email: ' BOOTSTRAP_EMAIL
read -r -s -p 'Unique passphrase: ' BOOTSTRAP_PASSWORD
export BOOTSTRAP_NAME BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
dc run --rm --no-deps -e BOOTSTRAP_NAME -e BOOTSTRAP_EMAIL -e BOOTSTRAP_PASSWORD bootstrap
unset BOOTSTRAP_NAME BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
```

Successful readiness writes `$STATE_DIR/current.json` atomically and retains
`previous.json`. Scheduled jobs use that exact configuration, not moving image tags.
Deployment, backup/maintenance and certificate changes share an atomic directory
lock. A failed backup, provisioning, migration or startup attempts to stop writers,
keeps `blocked.json`, sends a non-sensitive alert and exits nonzero. No automatic
rollback, schema downgrade, reseeding or volume deletion occurs. Inspect actual
container states if Docker itself fails. An abrupt host loss can leave a stale lock;
confirm no owner is running before removing the **empty** lock directory manually.

After inspecting the migration journal and database, correct the cause and retry
with `--resume-after-review=true`. Use `update` after successful role conversion,
or repeat `convert` only if privileged reconciliation is still needed. This flag
acknowledges a human recovery decision; it does not prove schema compatibility.
The SSH workflow refuses blocked state and cannot supply provisioning/recovery
approval. A reused prepared filename also fails rather than overwriting evidence.
Use the existing configuration for a reviewed manual retry or prepare a new private
path after changing configuration. See [release handoff](RELEASE_CANDIDATE.md).

For rollback, stop scheduled writers and review the **actually applied** migrations
before selecting a tested image pair. Run `rollback.mjs --schema-reviewed=true`
with the explicit parameters below. An older application may be incompatible with
a future migration even if its image is allowlisted. Leave maintenance blocked and
use the generated rollback config while in degraded mode; do not resume the old
release's mail/maintenance jobs. If compatibility is not established, repair forward
or restore the verified snapshot into a **separate** recovery database, sanitise
sessions/links and validate it before deliberate traffic cutover.

## Encrypted Backups and Schedules

`ops/Dockerfile` supplies PostgreSQL 16 clients, restic, curl and OpenSSL. It is a locally built operator image, not an automatically published application image. `docker-compose.operations.yml` mounts no Docker socket, drops capabilities and uses a read-only root filesystem. Scheduled jobs are host-owned systemd units.

Configure a **separate private off-host S3-compatible bucket**, HTTPS endpoint, bucket-scoped access keys, and `OPS_SECRETS_DIR` containing mode-600 `restic-password` and `alert-curl.conf`. Escrow the restic password separately; losing it makes the backup unrecoverable. Do not put these files in Git or CI artifacts. Production mode rejects a local repository path. A local Docker volume repository is used only for explicit disposable fixtures, so those tests do not prove cloud availability, bucket policy or disaster independence.

The production secret directory and files must be **root-owned** (directory mode 700, files mode 600), matching the operator container's UID 0. All capabilities remain dropped, so it cannot bypass another owner's permissions. Linux CI uses a networkless fixture initializer to copy only its generated password and capture-alert configuration into a root-owned private volume; it does not loosen production permissions or upload these files.

Backups stream `pg_dump` into restic with `--stdin-from-command`; a failed dump fails the backup rather than committing a silently truncated stream. The backup excludes session, recovery-token, outbox and rate-limit rows; user/business data and schema remain. Restore sanitisation is still mandatory. [Restic's command-stream guidance](https://restic.readthedocs.io/en/stable/040_backup.html#reading-data-from-a-command) explains this failure handling.

```bash
# After successful apply, use its pinned operator image/configuration.
oc() { docker compose -p clientops-production -f "$STATE_DIR/current.json" "$@"; }
oc run --rm --no-deps operations backup
oc run --rm --no-deps operations check
```

Install on Ubuntu only after a successful manual backup and restore drill:

```bash
sudo install -d -m 700 /usr/local/lib/clientops
sudo install -m 755 ops/scheduled.sh /usr/local/lib/clientops/scheduled.sh
# Create /etc/clientops/operations.env from ops/operations.env.example, mode 600.
# DEPLOYMENT_STATE_DIR identifies the successful release's pinned configuration.
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

The operator readiness request connects to Nginx inside Compose, preserving the URL
hostname/SNI and certificate verification with curl's [connect-to](https://curl.se/docs/manpage.html#--connect-to).
This works before opening the host firewall and does not depend on public DNS routing.
It is not an external availability probe; independent monitoring remains mandatory.

Status timestamps and failure markers live in `operations_state`, separate from business data. Monitoring verifies a trusted HTTPS database-readiness request, certificate lifetime (14-day warning by default), failed mail or pending/sending work older than ten minutes, a successful backup younger than 26 hours, and completed maintenance. Invalid timestamps and prior backup failures fail closed.

The local rehearsal deliberately tests database unavailability, backup connection failure, stale success markers, certificate-expiry threshold, failed email jobs and recovery. Webhook requests go only to an internal capture container. The private curl config supplies the real operator alert endpoint/auth in production. No recipients, reset links or tokens appear in alert payloads. Failed alert delivery exits nonzero and is visible in the unit journal. Both job-level notification and systemd `OnFailure` can notify, so duplicate alerts are possible.

This in-stack monitor cannot detect a dead VPS by itself. Before launch, configure an independent external HTTPS monitor and an off-host dead-man heartbeat for the backup timer. Verify an actual operator receives outage/backup/renewal alerts. A failed mail job must be investigated; do not delete evidence just to clear an alert. Terminal records are subject to documented 30-day retention. Security events remain redacted/bounded Docker logs; central access-controlled shipping and a tested 30-day retention policy are operator acceptance, not yet a hosted logging service.

## Restore and Rollback

`node scripts/verify-controls.mjs --followup` prepares the local encrypted repository. `node scripts/verify-restore.mjs --followup` takes a fresh encrypted backup, reads it back, restores to a **new uniquely named disposable database/volume**, sanitises sessions/links/outbox offline, provisions roles and applies migrations. It compares business fingerprints/relationships, login, tenant boundaries and source preservation. Private dump/config/key files stay under ignored/excluded `test-results/tls/`.

For a production incident, restore the selected restic snapshot to a private file on an isolated recovery host, create a new database and use `pg_restore --no-owner --no-acl --exit-on-error`. Never restore over the live database. Before connecting any application, run `dist/restore-sanitize.js` with the restore database owner URL, exact `RESTORE_CONFIRM_DATABASE` and `RESTORE_OFFLINE=true`; rotate session/mail secrets and provision roles. Validate counts, relationships, login and cross-organisation denial before DNS/traffic cutover. Maintain a monthly restore drill; `restic check` proves repository integrity, not application-level recovery. Do not accidentally send restored queued email.

Daily logical snapshots imply up to one backup interval of data loss after a failure (more if jobs failed). There is no WAL/PITR guarantee. Measured fixture timings are not production RTO; size, network and operator response matter.

The executable rollback command accepts only the recorded session-era digest pairs.
Use the successful release's private configuration and the same maintenance state:

```bash
node scripts/rollback.mjs --config="$STATE_DIR/current.json" --state-dir="$STATE_DIR" --confirm-project=clientops-production --target=7eba339 --schema-reviewed=true
# Older emergency fallback, only after reviewing its capability loss:
node scripts/rollback.mjs --config="$STATE_DIR/current.json" --state-dir="$STATE_DIR" --confirm-project=clientops-production --target=bdc749 --schema-reviewed=true --acknowledge-account-pause=true
```

No schema downgrade occurs. Old `bdc749` has no outbox worker/readiness endpoint:
stop proxy/API/workers, start the private API/web and wait for their health, then
start Nginx with account-changing routes already blocked. The API has no host port,
so there is no ungated traffic window. Container health uses **liveness only**, and
`/api/health/ready` explicitly returns 503 rather than pretending database readiness.
The gate matches Express's case-insensitive routes and rejects a directly published
API port. Monitoring must continue reporting degraded capability. Login and
ticket/comment work remain available and are rehearsed. Resume dispatch only after
rolling forward. JWT-era images are rejected. The generated rollback JSON/nginx
config is private; subsequent operations must use it until a deliberate roll-forward
to the original pinned configuration. Unknown schema changes require a new rehearsal,
not blind reuse of this allowlist.

## Trusted HTTPS and SMTP

Required operator inputs: domain/DNS, VPS access and pinned SSH fingerprint, production firewall policy, trusted certificate lineage, independent secrets, verified mail sender/SPF/DKIM/DMARC, authenticated TLS SMTP endpoint, private bucket/keys, external monitor/alert destination, key escrow and recovery owner.

For first certificate issuance, use Certbot DNS validation or standalone HTTP on port 80 **before** starting Nginx. After startup, the production Nginx configuration serves `/.well-known/acme-challenge/` from `ACME_WEBROOT_DIR`. Configure Certbot webroot renewal for that exact host directory. Install `ops/renew-certificate.sh` as a root-owned deploy hook; it checks expiry/key correspondence, installs the pair, validates Nginx and reloads. Run `certbot renew --dry-run`, then verify the public hostname/chain and operator alerts. [Certbot instructions](https://certbot.eff.org/instructions?ws=nginx&os=snap) are the source for host installation/renewal; issuance against a real domain has not been performed here.

The wrapper invokes `scripts/renew-certificate.mjs` using the deployed config in
`DEPLOYMENT_STATE_DIR`. Failed validation/reload restores the previous pair where
possible, leaves `certificate.failed`, attempts the configured operator alert and
returns nonzero. Do not equate a successful Certbot renewal with a successful deploy
hook. The local fixture verifies an actual served-serial change on Nginx, wrong-key
rejection and failure reporting using a private CA; it is not public CA acceptance.
On hook failure (including a deployment lock conflict), correct the cause and rerun
the hook explicitly; do not wait until the next certificate becomes due.

Keep the production TLS directory root-owned/private and its private key mode 600.
The public `fullchain.pem` is mode 644 after installation or recovery; certificates
are not secret. The Linux CI fixture has a runner-owned public-certificate directory
so the capabilities-dropped operator can validate its chain, while an actual file-open
check denies access to the runner-owned private key. No production capabilities or
secret-directory permissions are relaxed for this test.

The disposable helper renews a local certificate when fewer than 24 hours remain. Browser self-signed exceptions are restricted to loopback. Production has no certificate-verification bypass and rejects demo/test/capture-mail configurations. SMTP duplicate delivery remains possible if a worker crashes after SMTP acceptance but before recording success; retries preserve single-use tokens. Real SMTP/bounce/alert acceptance remains separate from Mailpit fixture evidence.

## Real-Environment Acceptance

**Outstanding until an operator records evidence below.** No resources, real email,
off-host upload, public CA request or external alert was sent during development.
Use staging with approved recipients and an independent recovery host. Store secrets,
recipient addresses, host identifiers and backups in the private operations record,
not public PR artifacts. Public evidence can identify the source SHA, application
registry digests, pass/fail, duration and a redacted evidence reference.

| Input               | Operator must supply                                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Domain/DNS          | Staging FQDN, DNS provider/change authority, A/AAAA targets, ACME method, firewall rules and certificate lineage/webroot                                        |
| Host                | Host/Docker architecture, SSH user/key and console-verified fingerprint, private env/state paths, Docker and Node24 access, free disk and maintenance window    |
| Independent secrets | Owner, migrator, runtime and backup passwords; session signing key; mail encryption key; bucket/alert credentials; secret-manager references and rotation owner |
| SMTP                | Authenticated TLS hostname/port, verified MAIL_FROM domain, SPF/DKIM/DMARC/bounce handling, approved invitation/recovery recipient and mail owner               |
| Off-host backup     | Private dedicated S3 endpoint/bucket/prefix, restricted access policy, retention, encryption password escrow location, separate recovery host and access drill  |
| Alerts/monitoring   | Named on-call recipient, tested webhook, external readiness probe, independent backup heartbeat/dead-man service and missed-heartbeat threshold                 |
| Security logs       | Access-controlled log destination, redaction policy, retention period (proposed 30 days), deletion verification and incident-review owner                       |
| Recovery objective  | Named recovery owner and alternate, approved RTO/RPO, restore schedule and sign-off authority                                                                   |

### HTTPS and Renewal

1. From an external network, `curl --fail https://STAGING_FQDN/api/health/ready`
   must succeed **without** `-k` or a private CA bypass. Verify hostname, chain and
   expiry with `openssl s_client -connect STAGING_FQDN:443 -servername STAGING_FQDN -verify_return_error`.
2. Install the root-owned hook and `/etc/clientops/operations.env`, including the
   stable `DEPLOYMENT_STATE_DIR`, `APP_DIR`, `TLS_CERTS_DIR` and exact allowed
   `TLS_RENEWAL_LINEAGE`. The hook rejects another lineage or hostname. Record the initial
   served certificate serial and `nginx -t` result using the pinned `current.json`.
3. Run `sudo certbot renew --dry-run --run-deploy-hooks` and inspect **both** Certbot
   and hook results, `certificate.ok`, Nginx reload acknowledgment and external
   readiness. A dry run may reuse the active certificate; it does not prove a new
   public serial was deployed. Record the next genuine renewal's changed serial.
   See [Certbot renewal/hook semantics](https://eff-certbot.readthedocs.io/en/stable/using.html#renewing-certificates).
4. In a staging maintenance window, exercise the hook with a deliberately mismatched
   private test lineage, not the live private key. It must reject installation,
   preserve the served certificate, create `certificate.failed`, return nonzero and
   reach the designated operator. Correct the lineage, rerun, and verify recovery.

### Real Mail, Backup and Alerts

1. Invite the approved staging recipient from Accounts. Record SMTP acceptance,
   actual inbox receipt (including spam filtering), sender verification and successful
   single-use setup. Request recovery, verify generic response, actual inbox arrival,
   password update and old-session/link rejection. Never publish the links or headers.
2. Install the reviewed timers; observe a **scheduled**, not only manual, backup.
   Verify its snapshot exists in the off-host encrypted repository after the timer
   completes. Record job start/finish, snapshot time and off-host integrity check.
3. On a different recovery host, retrieve the selected snapshot using escrowed access,
   restore into a new database with `pg_restore --no-owner --no-acl --exit-on-error`,
   run offline sanitisation, provision restricted roles and migrate with the pinned
   published image. Verify counts/FKs, login, cross-organisation denial, old-session
   and reset-link rejection. Keep outbound SMTP disabled during this drill.
4. Deliberately break the **staging backup job's** bucket credential (keep the working
   secret escrowed). The job must fail and reach the named operator. Restore access,
   take/check a new backup and verify alert recovery. Also test an unreachable alert
   endpoint: job exit/journal must expose the alert-delivery failure.
5. From the external monitor, stop the staging host during an approved window. Confirm
   independent readiness failure reaches the operator, then restart and verify recovery.
   Disable the backup timer long enough to miss its agreed heartbeat; the external
   dead-man service must alert even if the host monitor appears healthy. Re-enable
   the timer and verify a scheduled heartbeat resumes. These external monitors are
   operator-provided integrations, not automatically configured by this repository.
6. Record backup age at incident, actual last preserved transaction, detection time,
   operator acknowledgment, restore start and verified recovery finish. Compare with
   the agreed RTO/RPO; daily snapshots alone can lose up to an interval of writes
   (more after failures). Name the recovery owner/alternate and sign off the result.
7. Confirm security-event samples reach the restricted log destination without cookies,
   credentials or reset tokens. Verify retention/deletion and access permissions.
