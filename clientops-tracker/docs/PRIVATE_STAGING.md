# Private Staging and Release Handoff

Preparation only, 2026-11-10. **No first-customer release is approved for deployment.**
The published maintenance release is `cfec6e71a51975e224a2cee9ddda2238183b8b31`.
It does not include the product, branding or guidance candidates. Its registry
verification is not acceptance of their features or of real hosting services.

Use this numbered checklist with the existing [operator controls](OPERATOR_CONTROLS.md).
Do not use the production GitHub deployment workflow for staging. Keep the public
fictional walkthrough unchanged; never redirect it to a writable demo.

## One Operator Checklist

1. **Approve the candidate and inputs, before purchase.** Resolve independent
   CSRF/cookie review and tooling-risk decisions, then approve each stacked merge
   separately (#22, #34, guidance). Successful main push CI automatically publishes
   API/web images. After **each** approved merge, record main SHA, main CI, both
   publishing jobs, OCI labels, digests and a digest-pinned no-build rehearsal.
   Rebase/merge-parent, retarget and revalidate the next PR only after its parent lands.

2. **Choose a dedicated host and budget.** Planning baseline: Ubuntu 24.04 LTS,
   x86_64, 2 vCPU / 4 GiB RAM / 80 GiB disk, Frankfurt if appropriate for the
   agency's data location. Verify regional availability and contractual requirements.
   DigitalOcean lists this Basic Droplet at **USD 24/month**; Spaces starts at
   **USD 5/month**: **USD 29/month base**, before tax, domain, SMTP, monitoring,
   logs, excess storage/traffic and a separate recovery host. A second identical
   always-on recovery host adds USD 24/month. No all-in price is promised until
   providers and usage are chosen. Recheck [Droplet pricing](https://www.digitalocean.com/pricing/droplets)
   and [Spaces pricing](https://docs.digitalocean.com/products/spaces/details/pricing/).
   Do not buy until the owner approves the actual monthly total and region.

3. **Restrict ingress before starting containers.** Dedicated staging project
   `clientops-staging`, database `clientops_staging`, env `/etc/clientops-staging/staging.env`,
   state `/etc/clientops-staging/deployment`, separate bucket/prefix and encryption key.
   Cloud firewall permits SSH only from approved operator IPs; do not open 80/443,
   3000, 8080 or 5432. Set `HTTP_BIND=127.0.0.1`, `HTTP_PORT=80`, `HTTPS_PORT=443`.
   Compose exposes neither API nor database. Do not rely solely on UFW with Docker.
   Verify the SSH host fingerprint through the provider console. Each tester gets
   their own revocable SSH key, not the deployment identity or Docker group.

4. **Use a domain for trusted HTTPS.** Register/choose a staging subdomain only with
   approval. DNS-01 validation allows trusted issuance without opening HTTP. The
   operator installs the DNS provider's supported Certbot plugin and restricts its
   private credential to that zone. Domain/provider-specific issuance commands must
   be confirmed after the provider is selected; they cannot truthfully be supplied
   before that choice. Put the trusted pair in the private staging TLS directory.
   Set `APP_ORIGIN=https://staging.YOUR_DOMAIN:8443`. On approved tester machines,
   resolve that name to 127.0.0.1 using a local hosts entry and run:

   ```bash
   ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:8443:127.0.0.1:443 TESTER@STAGING_HOST
   # Browser: https://staging.YOUR_DOMAIN:8443 (no certificate bypass)
   ```

   Limit tester keys to local forwarding to 127.0.0.1:443 using reviewed sshd
   `PermitOpen`/`AllowTcpForwarding local` rules; no shell or Docker access.
   Test the SSH configuration before reloading it. Revoke the key and terminate
   that account's live SSH sessions to revoke an existing tunnel. Disable its portal
   account separately to invalidate application sessions. Without the tunnel,
   anonymous Internet access to the host's 80/443 must fail. Within an approved
   tunnel, the login page is public but `/api/auth/me` must return 401 anonymously.

5. **Supply private configuration, never secret values in chat/Git.** Install Docker
   Engine + Compose plugin, Node 24, Git and OpenSSL from their supported official
   repositories. Pin the clean reviewed checkout and create root/private directories:

   ```bash
   git clone https://github.com/EdenCirakoglu/Client-Tracker.git /opt/clientops-staging
   cd /opt/clientops-staging
   git checkout --detach "$RELEASE_SHA"
   cd clientops-tracker
   sudo install -d -m 700 /etc/clientops-staging /etc/clientops-staging/deployment /etc/clientops-staging/tls /etc/clientops-staging/backup-secrets
   # Operator supplies staging.env and secrets privately; do not source untrusted files.
   ```

   Secret/config names: `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`,
   `ADMIN_DATABASE_URL`, `MIGRATION_PASSWORD`, `RUNTIME_PASSWORD`, `BACKUP_PASSWORD`,
   `MIGRATION_DATABASE_URL`, `DATABASE_URL`, `SESSION_SECRET`, `MAIL_ENCRYPTION_KEY`,
   `APP_ORIGIN`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`,
   `MAIL_FROM`, `TLS_CERTS_DIR`, `ACME_WEBROOT_DIR`, `RESTIC_REPOSITORY`,
   `BACKUP_ACCESS_KEY_ID`, `BACKUP_SECRET_ACCESS_KEY`, `OPS_SECRETS_DIR`, and private
   files `restic-password`, `alert-curl.conf`. Database URLs use **postgres:5432**,
   not localhost. Owner, migrator, runtime and backup identities/passwords are
   independent. Staging uses production safety checks: no demo/test/capture mode.
   SMTP must restrict recipients to an explicitly approved staging allowlist.
   Installation does not itself authorize sending an invitation/reset.

6. **Prepare the pinned installation.** Execute as the host owner used by the
   operator jobs, with root-owned private secret mounts; see directory ownership
   in OPERATOR_CONTROLS. These commands are gated on approved real-service inputs:

   ```bash
   export PROJECT=clientops-staging
   export STATE_DIR=/etc/clientops-staging/deployment
   export CONFIG="$STATE_DIR/releases/$RELEASE_SHA/compose.json"
   umask 077
   node scripts/deploy.mjs prepare --env=/etc/clientops-staging/staging.env --config="$CONFIG" --project="$PROJECT" --revision="$RELEASE_SHA"
   dc() { docker compose -p "$PROJECT" -f "$CONFIG" "$@"; }
   dc run --rm --no-deps operations init # NEW backup repository only
   dc run --rm --no-deps operations check
   node scripts/deploy.mjs apply --config="$CONFIG" --project="$PROJECT" --revision="$RELEASE_SHA" --state-dir="$STATE_DIR" --mode=install --allow-provision=clientops_staging
   ```

   Prepare pulls published application images, validates revision labels and removes
   builds from the rendered configuration. Only the **operator** image is built,
   from that same clean source SHA with `SOURCE_REVISION`; its image ID is pinned.
   Install refuses populated schemas. Provisioning is an explicit privileged job,
   never API credentials. Bootstrap only a new installation using the private
   interactive command in OPERATOR_CONTROLS; never seed production/staging.

7. **Verify restriction and the three jobs.** Inspect `docker ps`/`ss -lntp` on the
   host; only loopback proxy ports and approved SSH should be bound. From an
   unapproved external machine verify 80/443 are unreachable. Through the tunnel:

   ```bash
   curl --fail https://staging.YOUR_DOMAIN:8443/api/health/ready
   curl -s -o /dev/null -w '%{http_code}\n' https://staging.YOUR_DOMAIN:8443/api/auth/me # 401
   dc exec -T api node dist/check-runtime-role.js
   ```

   No demo shortcuts/accounts. Run the [human task](FIRST_CUSTOMER_TASK_CARD.md)
   with two fictional organisations. Record role, revision, expected/actual results,
   persisted decisions and privacy denials. Do not put tokens or recipient identities
   in public artifacts. An external private monitor needs a separately authorised
   tunnel/VPN; a host's own successful probe cannot detect its own disappearance.

8. **Accept real operations on this host, not fixtures.** Use the detailed
   OPERATOR_CONTROLS acceptance steps. Record trusted chain/hostname, `certbot renew
--dry-run --run-deploy-hooks`, hook execution, `nginx -t`, reload and deliberate
   failure reaching the named operator. Record the next genuine renewal serial.
   Verify actual approved inbox receipt for invitation, recovery and workflow notice.
   Observe a scheduled encrypted off-host backup, restore it to a different host
   with outbound mail blocked, sanitise sessions/tokens/outbox offline and verify
   the decision record, relationships, login and tenant denial. Verify real alert
   receipt and external stopped-host/missed-backup-heartbeat detection. Test log
   redaction/access/retention. Assign recovery owner and alternate; record incident,
   detection and restoration timestamps, approved RTO and RPO. Daily dumps can lose
   up to a day or more after failed jobs; there is no PITR claim.

9. **Update or recover without guessing schema compatibility.** Prepare a new
   private release file, then `apply --mode=update` with the same project/state.
   It stops writers, checks quiescence, takes/read-checks an encrypted backup,
   migrates, checks runtime grants and trusted readiness before recording success.
   On failure leave `blocked.json` and writers stopped, inspect the migration
   journal/config/logs privately. Resume only after reviewed repair with
   `--resume-after-review=true`. Migration 0007 introduces workflow outbox jobs;
   older workers are not compatible. The old `rollback.mjs` 7eba339/bdc749 allowlist
   is **not** a safe rollback authorization for this schema. Keep the previous
   compatible image pair/config and verify it against a restored copy before use.
   Without that evidence, repair forward or restore the pre-upgrade backup into a
   **new** recovery environment, sanitize and verify before any traffic cutover.

10. **Stop and retire safely.** Stop staging schedules first; on a dedicated staging
    host use its own `/etc/clientops/operations.env` pointing only at staging state
    (never cohost production schedules under the same unit names). Stop the exact
    project using the recorded private configuration:

    ```bash
    docker compose -p clientops-staging -f /etc/clientops-staging/deployment/current.json stop
    # After owner-approved backup/escrow retention and retirement confirmation:
    docker compose -p clientops-staging -f /etc/clientops-staging/deployment/current.json down
    ```

    `down` deliberately retains data volumes; do not use `-v` by default. Inventory
    exact staging-only volumes before separately approved deletion. Revoke tester,
    SMTP, DNS, backup and alert credentials; close tunnels; remove hosts entries.
    Powering off is **not** the end of billing. Destroy the staging Droplet through
    the provider after retention approval, and separately review billable volumes,
    snapshots, bucket subscription and other services. Retained backups may remain
    billable by design. See [DigitalOcean billing guidance](https://docs.digitalocean.com/support/i-dont-recognize-a-charge-on-my-invoice/).

## Conditional Production Handoff

No candidate is an approved production release yet. After approval, publication,
digest rehearsal and staging sign-off, use the same `prepare`/`apply` sequence above
with **independent** `/etc/clientops/production.env`, `clientops-production`, database,
state, bucket, secrets and origin. Do not copy staging secrets or move its database.
Choose `install` for empty DB, `convert --allow-provision=EXACT_DATABASE_NAME` only
for the documented owner-role conversion, or `update` for restricted-role installs.
Keep access closed through bootstrap and smoke checks; public ingress needs separate
approval. Run runtime-role check, readiness, login, request/comment, decision and
logout replay checks, then back up and schedule operations.

Production rollback is deliberately conditional: inspect actual applied migrations,
stop writers/schedules and retain the failed configuration. If the saved previous
pair is rehearsed as schema-compatible, apply that reviewed prepared configuration
with `--mode=update --resume-after-review=true` and verify readiness/business records.
Do not substitute an arbitrary older SHA or delete migration history. If compatibility
is unproven, use the isolated restore/repair-forward procedure instead. The operator
and support owner must be named in the signed handover before customer production.

Missing inputs: approved domain/DNS and SSH access; region/budget/providers; private
secrets; authenticated SMTP/verified sender and approved recipients; dedicated backup
storage/key escrow/recovery host; external monitor/heartbeat/alert destination; log
retention; recovery owner/alternate and RTO/RPO; support hours and installation terms.
Supply references through private configuration, never secret values in chat.
