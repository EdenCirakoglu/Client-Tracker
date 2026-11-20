# Private Staging and Release Handoff

Account handoff updated 2026-11-20. **No customer installation or real-host acceptance is evidenced.**
The published maintenance release is `cfec6e71a51975e224a2cee9ddda2238183b8b31`.
It does not include the product, branding or guidance candidates. Its registry
verification is not acceptance of their features or of real hosting services.

Use this numbered checklist with the existing [operator controls](OPERATOR_CONTROLS.md).
Do not use the production GitHub deployment workflow for staging. Keep the public
fictional walkthrough unchanged; never redirect it to a writable demo.

## Connect The Personal Accounts

On the operator's Windows machine, run these commands from `clientops-tracker` in the release-preparation checkout. The first command creates a user/SYSTEM-only folder outside Git and preserves an existing file. The second opens that private file locally. Store passwords and keys in a personal password manager; enter item references, account IDs and non-secret settings in the file. Do not upload the file. It is an operator worksheet, not a Compose env file.

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\init-personal-staging.ps1
notepad.exe "$env:LOCALAPPDATA\ClientOpsTracker\private-staging\operator.json"
```

1. **DigitalOcean / Spaces.** Open [personal projects](https://cloud.digitalocean.com/projects), [billing](https://cloud.digitalocean.com/account/billing) and [Spaces](https://cloud.digitalocean.com/spaces). Use the control panel; a full-access personal API token is not needed. Record the personal project, public SSH key fingerprint, operator IP range and tax-inclusive monthly GBP estimate in `digitalOcean`. After release and budget gates only, use the London Basic Regular 2 vCPU/4 GiB host and a dedicated private bucket. Create a [limited bucket key](https://docs.digitalocean.com/products/spaces/how-to/manage-access/) with read/write/delete for restic maintenance on that bucket only; put its vault reference in `backup`. Escrow the independent restic password away from the host and bucket credentials.
2. **Domain / DNS.** At [registrar search](https://porkbun.com/checkout/search), check `clientopstracker.com`, then `clientopsjournal.com` if necessary. Verify ordinary availability and both registration and renewal totals including tax before ordering; a registry not-found result is not a quote or reservation. Add the chosen zone in [Cloudflare](https://dash.cloudflare.com/). Create a [zone-limited token](https://dash.cloudflare.com/profile/api-tokens) with DNS Edit for DNS-01; do not grant account, Workers or all-zone access. Record the zone and secret reference under `dns`. Keep the Git-connected walkthrough untouched. Configure a receiving/forwarding support alias to the approved inbox and test a reply before publishing it; sending-domain verification alone does not create that inbox.
3. **Resend.** Add a sending subdomain in [Domains](https://resend.com/domains); install its provider-issued DNS records and wait for verification. In [API Keys](https://resend.com/api-keys) choose Sending access for that domain only. Save its vault reference and verified sender under `mail`; only its SMTP password goes to the host. Use implicit TLS port 2465. The personal test recipient is recorded privately. Check actual inbox receipt and the portal return destination; SMTP acceptance alone is insufficient.
4. **Healthchecks.** From [Projects](https://healthchecks.io/projects/) create a separate staging project, two checks (application health and successful off-host backup), and an email integration to the approved inbox. Match each schedule and grace period to its installed timer. Save the two secret ping URLs in the vault and references in `monitoring`; no management API key is required on the host. Check failure, missed heartbeat, actual inbox receipt and recovery before marking accepted.
5. **Stripe sandbox.** Open [Sandboxes](https://dashboard.stripe.com/sandboxes), select a personal sandbox, create the two GBP 375 test requests and record only the sandbox identifier under `orders`. Dashboard access within that sandbox suffices; do not give the portal a Stripe key. Use [sandbox payment methods](https://docs.stripe.com/testing-use-cases) for paid, declined and abandoned sessions; verify settled status, reference, currency and receipt separately. Leave live payments off pending seller identity, tax, reviewed cancellation terms and installation acceptance.

No cloud or payment credentials are needed in GitHub to perform these manual steps. Do not put Stripe, registrar, DO control-plane or DNS administration credentials into the API container.

For local CLI provisioning instead of manual DO console actions, create a short-lived personal [custom-scoped token](https://cloud.digitalocean.com/account/api/tokens). With the project and SSH public key already created, grant only reads for the necessary account/project, region/size/image/key and VPC lookups, Droplet read/create, firewall read/create/update and project update for assignment (and provider-required dependent reads). Do not grant global write, SSH console, database, Kubernetes or billing-write access. At the hidden local prompt enter the token using [doctl named contexts](https://docs.digitalocean.com/reference/doctl/reference/auth/init/):

```powershell
doctl --config "$env:LOCALAPPDATA\ClientOpsTracker\private-staging\doctl.yaml" auth init --context clientops-personal
```

Use that same config and context on each command. Keep separate Spaces and DNS credentials and revoke the provisioning token after installation. If using the console, skip this token entirely.

## Consolidated Private Input Sheet

Eden is the proposed primary operator, support and recovery owner. Confirm capacity
and name an alternate or explicitly record the solo-operator availability risk.
Enter values in the private files below, **not chat, PRs, checkout or public forms**.
The [roadmap](ROADMAP.md) is the completion tracker; this is the input contract.

| Input / proposed default                 | Private location and required owner action                                                                                                                                                                                                                            |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Approved revision and security decisions | Record reviewed SHA, per-alert disposition and tooling limits in the release decision; no decision is inferred from CI.                                                                                                                                               |
| Hosting, region, budget                  | DigitalOcean Ubuntu 24.04, x86_64, Basic Regular 2 vCPU / 4 GiB / 80 GiB, London if available and appropriate. Approve region/data-location terms and actual quote before purchase. SSH public key/account in provider console; private key stays on operator device. |
| Domain and DNS                           | Owned `staging.<domain>`; DNS-01 certificate validation and zone-scoped DNS credential in root-only Certbot provider file. Confirm provider/plugin and subdomain; not a Workers deployment.                                                                           |
| Independent secrets                      | `/etc/clientops-staging/staging.env` mode 600: four DB passwords/URLs, `SESSION_SECRET`, `MAIL_ENCRYPTION_KEY`, SMTP and backup credentials. Use `openssl rand -hex 32` separately for each value; never reuse production secrets.                                    |
| SMTP and recipients                      | Verified sender/domain, provider account and explicit list of approved inboxes kept privately. Proposed Resend SMTP: `smtp.resend.com`, port `2465`, `SMTP_SECURE=true`, user `resend`; password is a provider-issued API key. No sends authorized by setup.          |
| Backup and escrow                        | Dedicated private bucket/prefix ending `/clientops-staging`; bucket-scoped key in env. `restic-password` in `/etc/clientops-staging/backup-secrets`, separately recoverable escrow not only on VPS. Approve retention and recovery-host budget.                       |
| Alerts / external monitoring             | Private `alert-curl.conf`, `monitor-heartbeat-curl.conf`, `backup-heartbeat-curl.conf`; approved alert recipient. Provider account outside VPS failure domain. Access-restricted HTTPS probing needs its own authorised tunnel/VPN.                                   |
| Operations acceptance                    | Recovery owner/alternate, support timezone/hours, log destination/access/retention. Proposed RTO 4 hours and RPO 24 hours are targets to approve and measure, not guarantees. Daily dumps are not PITR.                                                               |
| Commercial accounts                      | Seller country/entity, verified contact/booking account and eligible payment-provider sandbox. Final price/currency/terms and capacity need approval; no secrets or infrastructure credentials in checkout.                                                           |

### Provider Cost Check: 16 November 2026

| Component                                                                | Private staging planning default                                              | Future one-agency production planning default                                                          |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| [DigitalOcean Droplet](https://www.digitalocean.com/pricing/droplets)    | USD 24/month, 2 vCPU/4 GiB                                                    | USD 24/month baseline, not a capacity guarantee                                                        |
| [Spaces](https://docs.digitalocean.com/products/spaces/details/pricing/) | USD 5/month base subscription, 250 GiB storage / 1,024 GiB outbound allowance | USD 5/month baseline; separate credentials/location, account quota sharing only if explicitly approved |
| [Resend](https://resend.com/pricing)                                     | Free tier only if eligible/within 3,000 per month and 100 per day             | Budget USD 20/month Pro, 50,000 messages; quota/overage review required                                |
| [Healthchecks.io](https://healthchecks.io/pricing/)                      | USD 0 Hobbyist: 20 jobs, 100 retained entries per job                         | USD 0 if limits suffice, or USD 20/month Business; not a substitute for security-log retention         |
| Baseline subtotal                                                        | **USD 29/month**                                                              | **USD 49/month**, or USD 69 with Business monitoring                                                   |

These are published component prices, **not all-in quotes or purchases**. Exclude
tax, domain, provider overage, security-log hosting, operator labour and a separate
recovery host. An identical always-on recovery VM adds USD 24/month; a temporary
one is usage billed. Staging kept alongside production is additional, not free.
Use personal accounts only. Confirm the London-region quote, billing tax and FX, existing project charges, storage/egress, domain and recovery-host overlap. Total recurring infrastructure must stay within GBP 40/month equivalent; ordinary domain registration AND renewal must stay within GBP 20/year including known taxes. Do not provision with an unknown all-in total.
Power-off does not stop VM charges; retained storage/backups can remain billable.

**SMTP feasibility:** DigitalOcean documents blocking ports 25/465/587 on Droplets.
Do not use the generic example's 587 default there or promise an unblock. Resend
documents implicit TLS on 2465; verify allowed egress and account authentication
on the approved host before accepting installation. This alternative is a planned
configuration, not a host-tested claim. Sources: [DO restrictions](https://docs.digitalocean.com/support/why-is-smtp-blocked/),
[Resend SMTP](https://resend.com/docs/send-with-smtp).

```bash
# Approved host only; this checks TLS connectivity, not authentication or inbox receipt.
timeout 10 openssl s_client -connect smtp.resend.com:2465 -servername smtp.resend.com -verify_return_error -brief </dev/null
```

## Current Entry Gates

Use the [exact PR stack and check results](RELEASE_INTEGRATION.md) before this
checklist. The 20 November [#22 policy analysis](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/44792492013) supersedes its earlier failing policy.
The owner-led AI-assisted review classified alerts #1 and #3 under the documented ingress conditions, not as an independent audit.
The updated #22 audit fixes the minimatch chain; only the restricted Drizzle Kit exception expires 2 December 2026. Recheck audits on every reconciled head.
#37's conflict has been reconciled on its review branch; fresh check results and
the intro harness backport are in RELEASE_INTEGRATION. #43's visual evidence stays tied
to `46c2c8575a193e0ca08088f65647552acbcef8e6`, with owner acceptance pending.
Provisioning is conditional on release verification, personal account access and the all-in budget.

Cloudflare's Git build is not this portal's staging procedure. Its configured
`npx wrangler preview` fails for missing `previews` configuration before building
the application. Target/root settings need owner confirmation; adding that block
alone is not a Compose deployment. Do not run it to bypass these gates or alter
the working static walkthrough. Keep the failing check visible until the intended
target and a separately authorized configuration are reviewed.

For alert #3, inspect the deployed, resolved Compose configuration privately:
API must have `NODE_ENV=production`, trusted HTTPS origins, `TRUST_PROXY=1`, and
no published API/database ports. Only Nginx forwards to API and overwrites
`X-Forwarded-Proto` with `https`; plain HTTP redirects before session issuance.
Never treat an arbitrary client's forwarded header as proof of TLS. Confirm
`__Host-clientops.sid`, Secure, HttpOnly, SameSite=Lax, Path=/ and no Domain in a
real browser on the intended trusted host. Verify missing/invalid/cross-session
CSRF proofs fail and valid authorised requests persist. Local proxy simulations
and historical fixture TLS are not real-service or independent security approval.

## One Operator Checklist

1. **Verify the candidate and inputs before purchase.** Integrate sequentially under the owner's conditional authorization
   (#22 -> #34 -> #35 -> #36 -> #37 -> #43 -> #44 -> #45).
   Source review need not wait for buying a host; actual host controls remain a
   separate acceptance gate. Successful main push CI automatically publishes
   API/web images. After **each** approved merge, record main SHA, main CI, both
   publishing jobs, OCI labels, digests and a digest-pinned no-build rehearsal.
   Rebase/merge-parent, retarget and revalidate the next PR only after its parent lands.

2. **Choose a dedicated host and budget.** Planning baseline: Ubuntu 24.04 LTS,
   x86_64, 2 vCPU / 4 GiB RAM / 80 GiB disk, London if available and appropriate for the
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
   sudo -i # Open a root shell on the dedicated staging host; run the remaining commands there.
   set -eu
   export RELEASE_SHA=OWNER_APPROVED_FULL_MAIN_SHA
   git clone https://github.com/EdenCirakoglu/Client-Tracker.git /opt/clientops-staging
   cd /opt/clientops-staging
   git checkout --detach "$RELEASE_SHA"
   cd clientops-tracker
   sudo install -d -m 700 /etc/clientops-staging /etc/clientops-staging/deployment /etc/clientops-staging/tls /etc/clientops-staging/backup-secrets
   test ! -e /etc/clientops-staging/staging.env # Stop if it exists; preserve prior private configuration.
   # Only for this fresh installation, after confirming the preceding test succeeds:
   sudo install -m 600 .env.production.example /etc/clientops-staging/staging.env
   sudoedit /etc/clientops-staging/staging.env
   # Replace every placeholder privately using the input sheet; do not source env as shell code.
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
   Use a provider-enforced recipient allowlist if available. Otherwise keep all
   accounts/contact addresses in this restricted installation within the privately
   approved list and verify every recipient before sending; the application does
   not currently implement a staging recipient allowlist. Do not claim one exists.
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
   node scripts/staging-preflight.mjs --config="$CONFIG" --revision="$RELEASE_SHA" --mode=install
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

   The new preflight is read-only and does not invoke Docker, email or network
   services. It checks the rendered production-mode contract, fixed staging
   identity, digest pins, loopback-only gateway, independent role credentials,
   private volumes and off-host backup prefix. It rejects placeholders; it does
   not prove secret entropy, firewall rules, image provenance or TLS validity.
   Existing `deploy apply` still checks actual image labels and readiness. Keep
   the rendered JSON private: it contains secrets. Use `--mode=update` on updates.
   These commands require the reviewed release containing this preflight; the
   older cfec6e71 release does not contain it or the Meridian product features.

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

## External Heartbeats and Solo Acceptance

After approving a provider, create **two distinct** checks outside the VPS:
monitor every 10 minutes with 5 minutes grace, and backup every 24 hours with
2 hours grace, adjusted to the actual timers. A heartbeat alone is not an external
HTTPS probe. Store each assigned HTTPS ping URL as `url = "..."` in its private
root-owned mode-600 curl file; do not put URLs containing tokens in commands/logs.
Never ping success before the operation finishes.

On the dedicated staging host, use `sudo systemctl edit clientops-ops@backup.service`:

```ini
[Service]
ExecStartPost=/usr/bin/curl --config /etc/clientops-staging/backup-secrets/backup-heartbeat-curl.conf --silent --fail --max-time 10 --output /dev/null
```

Use the same override on `clientops-ops@monitor.service`, changing only the file
to `monitor-heartbeat-curl.conf`. The existing template's `OnFailure` still alerts;
if the host disappears, the independent provider detects a missing ping. Run
`sudo systemctl daemon-reload`, then explicitly start each job and verify its
provider timestamp. Stop the monitor timer and separately the backup timer for
their agreed grace periods; confirm actual alert receipt, then restart them.
Do not shorten the production backup policy merely to make this test pass.
For a stopped-host test, schedule a bounded maintenance window and external alert
observation before shutdown. An on-host curl cannot prove detection of a dead VPS.
These are operator instructions, **not executed external tests**.

Use the existing [ten-minute task card and screen-reader walkthrough](FIRST_CUSTOMER_TASK_CARD.md)
with separate Admin, Developer and Client accounts, two fictional organisations,
and an approved inbox. The [answer key](FIRST_CUSTOMER_TASK_KEY.md) is for the
moderator; [Start here/user guide](FIRST_CUSTOMER_GUIDE.md) remains available in
the portal. Eden may run the script alone and record browser/AT versions, actual
speech, focus, errors and completion. Label that **solo QA**, not independent
first-use evidence. Human screen-reader results remain pending until performed.

Record installation effort in the [private worksheet](product-hunt/QUOTE_WORKSHEET.md):
phase start/end, active work, unattended wait, failure/rework, external evidence and
excluded tasks. A full rehearsal must include fresh-host configuration, approved
SMTP receipt, off-host restore, actual alert, user onboarding and handover; no
sum of local CI durations can substitute for it.

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
