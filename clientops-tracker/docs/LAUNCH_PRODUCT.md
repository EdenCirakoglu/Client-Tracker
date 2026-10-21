# Launch Product Increment

## Review Boundary

Branch: `feature/agency-onboarding-notifications`, based on reviewed PR #20 head
`27c7dbb35a7fa855a87ad7ae05ef5034a663c4ec`. PR #19 is merged; #20 remains a
separate draft against main. Review this product increment against #20, not as a
replacement for its dependency changes. No merge, publication, public deployment,
checkout activation or real-recipient email is authorized by this record.

Product review: [draft PR #22](https://github.com/EdenCirakoglu/Client-Tracker/pull/22),
[incremental files](https://github.com/EdenCirakoglu/Client-Tracker/pull/22/files).
After an approved #20 merge, retarget #22 to main, inspect the new diff and run
fresh CI and CodeQL for that candidate. No product CodeQL result is inferred from
#20's analysis. PRs #14/#18 have not been closed.

Historical #19 evidence at `7693de8131d9ea11dcff30dbd695219c64a4170d` and
#20 evidence at `d9099b6febd6ac5f682649ae4d109909d9215d30` remain unchanged.
The four development-tool risk decisions in [the inventory](DEPENDENCY_REMEDIATION.md)
are proposed, not approved. Full audit findings remain visible.

## Implemented Scope

- Administrator-only setup checklist, derived from current installation records.
- Transactional workflow notices for designated client reviews and responsible
  internal decision recipients; explicit selected-contact summary notices.
- Shared durable worker with separate typed/encrypted workflow payloads,
  send-time authorization/revision checks, preferences and safe administrator status.
- Pending summary decisions first, short headings and preserved period/snapshot
  context. No new tenancy, reminders, automatic weekly sends or AI integration.
- Additive migration 0007; no historical migration rewrite or database reseed.

The full recipient, locking, retry, retention and compatibility contract is in
[PRODUCT_WORKFLOWS.md](PRODUCT_WORKFLOWS.md#onboarding-and-workflow-notices).
The current progress checklist remains in [ROADMAP.md](ROADMAP.md).

## Revision-Specific Verification

Application source and complete local verification:
`99e698a002e302cfa88249f17469138b5112a0dc`.
[Its full hosted CI run](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39630754092)
uses an explicit PR-head checkout, not the base branch's results. The PR review
summary records the final capture/documentation head, its separate full CI result,
artifact identifier and checksum; these do not relabel the results below.

| Check at 99e698a                              | Actual local result / evidence                                                                                                                             |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typecheck; verification helper tests          | Passed; 26 helper tests                                                                                                                                    |
| API tests on the separate launch test cluster | 182 passed across 20 files; includes transactional enqueue rollback, authorization locks, stale revisions, preferences and duplicate processing            |
| Complete combined browser suite               | 13 passed; administrator/developer/client, scope revisions, delivery changes, client-safe export, captured workflow notices and account recovery           |
| Native zoom, keyboard and axe                 | Passed; `test-results/launch-ui-99e698a/acceptance.json`, actual Chrome settings at 200%, isolated profile, clean source checkout                          |
| Restricted database permissions               | Passed; runtime DDL, truncation, business/history deletion and escalation rejected; backup role read-only                                                  |
| PostgreSQL outage and recovery                | Passed; readiness 503 in 767 ms, authenticated request 503 in 6014 ms, liveness 200; readiness/authentication recovered to 200                             |
| SMTP fixture failure/retry and restart        | Passed; persisted retry, concurrent workers, stale reset rejection, session revocation and redacted logs in `test-results/operations-runtime.json`         |
| Encrypted backup and failure detection        | Passed; readback, wrong-key rejection, maintenance and six captured local alerts; `test-results/operator-controls.json`                                    |
| Separate populated restore                    | Passed; 12 business-table fingerprints/relationships preserved, source unchanged, restored sessions/links invalidated; `test-results/restore-runtime.json` |
| Recovery timing                               | 4.199 s dump, 27.707 s small-fixture recovery; not a production SLA. Snapshot RPO only; no WAL/PITR                                                        |
| Dependency audit                              | Same lockfile; production npm audit clean, full audit still four proposed tooling decisions (one high, two moderate, one low)                              |
| Secrets                                       | Existing redacted scanner passed across 97 reachable commits; no suppressions added                                                                        |

Frozen installs, lint, formatting, both builds, migration generation/application,
Compose validation and the retained deployment-failure rehearsal are also required
by the linked hosted suite. Local containers are locally built verification
images, **not newly published GHCR release images**. Local upgrade snapshots
preserve populated data without reseeding; hosted fixtures additionally start
from the pinned historical populated image. Do not confuse the historical
rollback images pulled during recovery tests with publication of this product.

The session-era pinned rollback rehearsal preserves basic ticket/comment records
with account changes paused and restored mail cleared. It is not approval to run
an older worker against active `WORKFLOW` jobs: older images cannot process those
payloads and lack the new workflow routes. Drain/stop writers before migration;
prefer a compatible repair-forward plan and rehearse any actual rollback against
the proposed schema and queued work.

Earlier failures remain failures: 546628a exposed ambiguous account feedback;
f8781af passed 13 browser scenarios but its hosted viewport assertion caught the
onboarding block pushing the first mobile ticket action down. The fixes are
separate commits f8781af and 1c100e3. No viewport assertion or rate limit was
removed. Repeated local browser runs exhausted fixture auth limits; failed reports
were retained, the disposable API counter was restarted between runs and the
clean 13-scenario run passed. Do not reset customer rate-limit state to run tests.

Capture-only follow-up `d129bd2e6b41e5ea5724ca4fef3fdd5cdec7d939` passed the
focused workflow browser scenario and e2e typecheck. It expands the checklist and
captures the complete decision panel, without changing application behavior.
The native 390 x 844 action check remains; the panel capture uses 390 x 1100.
Human screen-reader acceptance and real-service acceptance remain outstanding.

## Reproduction

Use Node 24, pnpm 9.15.4 and running Docker Desktop/Linux containers. From the
repository checkout:

```powershell
cd clientops-tracker
pnpm install --frozen-lockfile
node scripts/hardening-stack.mjs start --launch
```

The new disposable namespaces are `clientops-launch-demo` and
`clientops-launch-accounts`; HTTPS ports 8460/8461 and capture mail 8040/8041.
No previous development or verification stack is reset. If local network
inspection requires an additional trusted CA, set `BUILD_CA_FILE` to its private
local PEM path. Never disable TLS validation. The initial local build failed on
certificate trust and succeeded using that existing build-secret mechanism.

```powershell
$env:VERIFY_URL="https://localhost:8460"
$env:WORKFLOW_MAIL_URL="http://localhost:8040"
$env:ACCOUNT_SETUP_URL="https://localhost:8461"
$env:ACCOUNT_MAIL_URL="http://localhost:8041"
$env:E2E_ALLOW_DISPOSABLE_DEMO="true"
$env:BROWSER_CHANNEL="chrome"
$env:E2E_SCREENSHOT_DIR="test-results/launch-product"
pnpm test:e2e
$env:VERIFY_PROJECT="clientops-launch-demo"
$env:UI_EVIDENCE_DIR="test-results/launch-ui"
node scripts/verify-ui-acceptance.mjs
node scripts/verify-database-roles.mjs --launch
node scripts/verify-operations.mjs --launch
node scripts/verify-controls.mjs --launch
node scripts/verify-restore.mjs --launch
```

Run suites sequentially against these fixtures. Repeated browser runs inside the
15-minute authentication window can legitimately return 429; wait for the window
or restart only the disposable fixture API for its in-memory counter. Persistent
route limits still apply. Never increase production limits to make tests pass.
If Docker's default address pools are exhausted, inspect existing networks and
assign an unused subnet to the new fixture only. `VERIFY_DISPOSABLE_SUBNET` can
select an unused restore network; this run used `10.240.55.0/24`. Do not prune
other projects or reuse a subnet that is already allocated.

Use Playwright's installed Chromium instead by leaving `BROWSER_CHANNEL` unset.
Browser report: `playwright-report/index.html`; machine-readable exact revision,
dirty-state flag and outcomes: `test-results/browser-results.json`.
Published CI artifacts exclude the private `test-results/tls/` directory.

For isolated API checks use `docker-compose.hardening-test.yml` in a new named
project, explicit `TEST_DATABASE_URL` and matching `DISPOSABLE_DATABASE_NAME`.
The local increment uses port 15436, database `clientops_hardening_test`,
Mailpit SMTP 11028/UI 18028. Test credentials are disposable fixture values
from that Compose file, never customer credentials.

```powershell
$env:TEST_PG_PORT="15436"
$env:TEST_SMTP_PORT="11028"
$env:TEST_MAIL_PORT="18028"
docker compose -p clientops-launch-product -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL="postgresql://clientops_test:disposable_test_password@127.0.0.1:15436/clientops_hardening_test"
$env:DISPOSABLE_DATABASE_NAME="clientops_hardening_test"
$env:SMTP_PORT="11028"
$env:MAILPIT_URL="http://localhost:18028"
pnpm lint
pnpm typecheck
pnpm test
pnpm test:verification
pnpm build
pnpm format:check
node scripts/check-migration-generation.mjs
```

## Evidence Selection

Before: unchanged application image built from maintenance head 27c7dbb, two
existing product/planning browser journeys passed. The live mobile decision
capture showed the complete heading and controls; historical clipping was not
reproduced. Pre-change captures stay under `test-results/launch-before-27c7dbb/`.
They are not new-product acceptance.

Select distinct new captures from the `launch-*` set, rather than duplicate
dashboard images from other scenarios:

| Capture                                   | Scenario                                          | Viewport    |
| ----------------------------------------- | ------------------------------------------------- | ----------- |
| launch-admin-onboarding.png               | Expanded setup checklist and operational overview | 1440 x 1000 |
| launch-developer-dashboard.png            | Developer personal queue and team context         | 1440 x 1000 |
| launch-client-dashboard.png               | Organisation-scoped client overview               | 1280 x 900  |
| launch-pending-decision-mobile.png        | Current client outcome agreement, complete panel  | 390 x 1100  |
| launch-summary-notification-outcome.png   | Explicit selected contacts, queued feedback       | 1440 x 1000 |
| launch-summary-client-mobile.png          | Published snapshot, decisions first               | 390 x 844   |
| launch-notification-preference-mobile.png | Persisted workflow opt-out, account mail separate | 390 x 844   |
| launch-notification-delivery-status.png   | Administrator captured delivery outcomes          | 1440 x 1000 |

Capture manifests/browser metadata must identify the tested revision. Do not
publish raw mail bodies, session cookies, reset links, keys or database dumps.
Screenshots contain fictional contacts only. A screenshot is not evidence of
external mail receipt, hosted image publication or customer acceptance.

Local inspected sets: `test-results/launch-product-99e698a/` and the corrected
`test-results/launch-product-d129bd2/` captures. Prefer the final hosted artifact's
eight `launch-*` images for review: its fresh fictional fixture avoids accumulated
records from repeated local runs. Do not include duplicate dashboard captures
from the other browser scenarios in the selected review set. The artifact also
retains the browser report and the native-zoom manifest for traceability.

## Manual Acceptance Still Required

Screen-reader acceptance is **outstanding**. With NVDA/Firefox or VoiceOver/Safari:
sign in, read the administrator checklist and follow a next action; navigate a
client review form; change the workflow preference and hear saving/success/error;
select summary contacts, publish, and hear queued feedback; inspect headings at
mobile width and 200% native browser zoom. Record reader/browser versions, tester,
date, outcome and any defects. Automated axe/keyboard checks do not complete this.

Owner decisions: approve or reject the four bounded tooling-risk proposals;
review #20 then the dependent product PR; approve merges separately. Domain,
SMTP/sender/recipients, secrets, backups/key escrow, monitoring/alerts, recovery
owner and targets, booking/checkout and a pilot remain the consolidated operator
inputs in the roadmap. All email verification in this increment uses Mailpit.
