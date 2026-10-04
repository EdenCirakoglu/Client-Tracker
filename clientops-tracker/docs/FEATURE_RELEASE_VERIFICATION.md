# Feature Release Verification

## Revision and Boundary

Started 2026-10-04 from `40e8bfe038573ebfe40de818b7e21e6359d6e3d3` on
`feature/request-acceptance`, identical to fetched `origin/main`. Checkpoint
`eaaf59e` preserves the previously uncommitted implementation and explicitly does
not claim release acceptance. Existing worktree and databases are preserved.
Nodemailer PR #14 and Morgan PR #15 remain separate dependency changes.

The operator subsequently authorised merging only after verification and then
synchronizing branches, including configured automatic image publication. Public
deployment, real email and payments remain outside this milestone.

## Reproduced Failures

- Unchanged full API suite: 101 passed, 1 failed, 13 files, 228.90s. The failure was
  `Server sessions and account lifecycle > limits login attempts with persistent
rate buckets`, exceeding its 20,000ms timeout. All concurrent token tests passed
  in this reproduction. Previous intermittent 503 remains a historical failure,
  not a confirmed duplicate-consumption race.
- The preceding session measured the exact 21-attempt rate-boundary sequence at
  27,321ms. Twenty real cost-12 bcrypt checks and database/session writes are
  intentional. The focused allowance is now 60s, with explicit 401 assertions for
  attempts 1-20 and 429/Retry-After for 21. Production limits, hashing cost, test
  isolation and request deadlines remain unchanged. A timed-out Vitest callback
  is not cancelled, so previously its remaining requests could overlap the next test.
- Historical combined browser artifacts contain an actual Nginx 504 from the
  Windows host-process preview. Repeated reuse also reached the existing auth
  ingress limit. These are not evidence of a workflow permission defect. This
  verification uses a separately named container stack with container DNS and
  fresh authentication state; no blanket retries or relaxed limits are added.
- Hosted runs at `61c0336` and `863f483` reproduced a delivery deep-link defect:
  asynchronous ticket sections moved `#delivery` outside the viewport. Commit
  `e9db61b` waits for both workflow sections to settle before scrolling, including
  after refresh; the browser viewport assertions remain intact.
- Run `37216116705` at `69ca377` passed all 12 combined browser scenarios but failed
  the separate first-action viewport check. This also failed locally: delivery
  follow-up displaced the mobile ticket action. `33391a7` restores Needs attention
  ahead of delivery follow-up. No accessibility assertion was removed.

## Commands

From `clientops-tracker/`, Node 24, pnpm 9.15.4, Docker Desktop Linux containers and
Chrome/Playwright Chromium are required. Use system trust for local registry TLS
when necessary (`NODE_OPTIONS=--use-system-ca`); never disable TLS verification.

New isolated API fixtures (create once, no existing container is reset):

```powershell
docker run -d --name clientops-feature-release-tests-20261004 --network bridge -p 127.0.0.1:55440:5432 -v clientops-feature-release-tests-20261004:/var/lib/postgresql/data -e POSTGRES_USER=clientops_test -e POSTGRES_PASSWORD=disposable_test_password -e POSTGRES_DB=clientops_feature_release_test postgres:16-alpine
docker run -d --name clientops-feature-release-mail-20261004 --network bridge -p 127.0.0.1:11040:1025 -p 127.0.0.1:18040:8025 axllent/mailpit:v1.27.4
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@127.0.0.1:55440/clientops_feature_release_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_feature_release_test'
$env:SMTP_PORT='11040'
$env:MAILPIT_URL='http://127.0.0.1:18040'
pnpm install --frozen-lockfile
pnpm test
pnpm --filter @clientops/api exec vitest run tests/security.test.ts tests/workflow-boundaries.test.ts
pnpm lint
pnpm typecheck
pnpm format:check
pnpm test:verification
pnpm build
```

Production-style isolated preview and combined browser/operations checks:

```powershell
node scripts/hardening-stack.mjs start --feature
$env:VERIFY_URL='https://localhost:8458'
$env:ACCOUNT_SETUP_URL='https://localhost:8459'
$env:ACCOUNT_MAIL_URL='http://localhost:8039'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:BROWSER_CHANNEL='chrome'
$env:E2E_SCREENSHOT_DIR='test-results/feature-release-screenshots'
pnpm test:e2e
node scripts/check-browser-evidence.mjs
$env:VERIFY_PROJECT='clientops-feature-release'
node scripts/verify-ui-acceptance.mjs
node scripts/verify-database-roles.mjs --feature
node scripts/verify-operations.mjs --feature
node scripts/verify-controls.mjs --feature
node scripts/verify-restore.mjs --feature
node scripts/verify-deployment.mjs --feature
```

This machine's old Docker networks exhausted its automatic address pools. No
network was pruned. After checking Docker IPAM and host routes for overlap, only
the two new fixture networks were explicitly allocated:

```powershell
docker network create --driver bridge --subnet 10.240.40.0/24 --label com.docker.compose.project=clientops-feature-release --label com.docker.compose.network=default clientops-feature-release_default
docker network create --driver bridge --subnet 10.240.41.0/24 --label com.docker.compose.project=clientops-feature-release-accounts --label com.docker.compose.network=default clientops-feature-release-accounts_default
$env:VERIFY_DISPOSABLE_SUBNET='10.240.42.0/24'
node scripts/verify-restore.mjs --feature
$env:VERIFY_DISPOSABLE_SUBNET='10.240.43.0/24'
node scripts/verify-deployment.mjs --feature
Remove-Item Env:VERIFY_DISPOSABLE_SUBNET
```

Only use those ranges if unused on your machine; otherwise select unused private
subnets. Docker rejects overlaps. These are optional disposable-fixture settings,
not production networking requirements. For intercepted registry TLS, provide the
trusted CA bundle using `BUILD_CA_FILE`; never disable TLS verification.

The fixture upgrades populated legacy data without reseeding existing databases.
Only the new nullable original-request columns are excluded from pre/post upgrade
comparisons; all existing business fields are compared. Restore fingerprints
include all workflow tables and fields. An older application image does not undo
migrations or support the new workflow; rollback must follow the reviewed runbook.

## Results

Application revision **`33391a705a5a086a3cd0754345f81682448f9935`** passed the
complete [hosted CI run 37216620255](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/37216620255)
from a fresh checkout. Review and subsequent exact-head checks:
[PR #16](https://github.com/EdenCirakoglu/Client-Tracker/pull/16).

| Gate                        | Actual result and revision                                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local API                   | `61c0336`: 111 passed / 14 files, 214.36s; focused security/workflow 24 passed, 107.52s. API source unchanged through `33391a7`.                                                                                                                                                                                                                                                               |
| Repeated concurrency        | Three invitation and three reset-consumption rounds, contradictory delivery/scope decisions and stale-account contexts passed. The historical intermittent 503 did not recur; its original database error was not retained, so no exact cause is claimed.                                                                                                                                      |
| Local source checks         | Frozen installation, lint, typecheck, formatting and both workspace builds passed; both container builds also passed. Final dashboard correction built successfully in Docker.                                                                                                                                                                                                                 |
| Hosted source checks        | `33391a7`: lint, typecheck, formatting, 111 API tests, 25 helper tests, both builds and both Compose validations passed.                                                                                                                                                                                                                                                                       |
| Combined local browser      | Clean `69ca377`: 12 passed, no failures/skips/flaky tests, 295.045s. Its later separate mobile-action failure is recorded above, not hidden by this result.                                                                                                                                                                                                                                    |
| Combined hosted browser     | Clean `33391a7`: 12 passed, no failures/skips/flaky tests, 113.675s; includes previous portal/account scenarios plus delivery planning and the complete scope/acceptance/summary journey.                                                                                                                                                                                                      |
| Final UI acceptance         | `33391a7`, local and hosted: keyboard/axe, visible first mobile action and native 200% zoom passed. Local Chrome 154 used a new isolated profile: device pixel ratio 1 to 2, CSS width 1422 to 711 at unchanged outer width 1440. Delivery and summaries included.                                                                                                                             |
| Populated upgrade           | Clean `863f483` local fixture: all eight pre-feature business-table fingerprints matched after migrations 0003-0006 without reseeding. The original result was preserved as `feature-upgrade-863f483.json`; later fixture starts are idempotent, not new legacy upgrades. Fresh hosted fixture at `33391a7` also passed.                                                                       |
| Restricted roles/outages    | `33391a7`, local and hosted: runtime DDL/deletion/escalation denied, backup role read-only; DB readiness 503, liveness 200, authenticated requests safely unavailable, recovery 200. SMTP retry/restart/concurrent workers, stale links, revocation and log redaction passed.                                                                                                                  |
| Encrypted populated restore | `33391a7`, local and hosted: all 12 business/workflow tables preserved, with API equality checks for saved delivery exports, scope records and summaries. Sessions/links invalidated; login and tenant boundaries passed; source unchanged. Local dump 5.312s, recovery 35.015s; hosted recovery 17.689s. These are small-fixture timings, not an SLA.                                         |
| Deployment/rollback         | `33391a7`, local and hosted: first install, published `7eba339` role conversion, verified backups, injected SQL/startup failures, explicit recovery, later update and private-CA renewal/reload failure handling passed. Pinned session-era `bdc7494` rollback preserved data with account changes blocked; it does not support new workflows, readiness or durable mail. No schema downgrade. |
| Public/registry release     | These gates use source-built fixtures and existing digest-pinned legacy images. They do not prove runtime verification of a new published pair. Main CI and automatic publication, if subsequently merged, are separate runs recorded on the PR. No public deployment.                                                                                                                         |

`b9160ea` subsequently strengthens the evidence-only privacy gate by inspecting
decoded JSON fields, including escaped Windows paths. **26 local helper tests**
pass. Missing, malformed, empty, stale or private reports fail closed; failed
test reports may be retained safely without making CI pass. This change and the
following documentation commit require their own complete PR-head CI.

Checkpoint patch/history secret scans passed. Nodemailer/Morgan dependency PRs
remain separate; GitHub's existing dependency alerts are not claimed resolved by
this feature work.

The [downloaded hosted artifact](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/37216620255/artifacts/11309160987)
records clean `33391a7`. SHA-256:
`f38ddd7ff4c5e9b5dd58d3be9f5518c1873a2a90ce3728344c766549257416c6`.
No `.pem`, `.key` or `.dump` files were present. The explicit `metadata.revision`
is the checked-out PR head; GitHub's automatically supplied `metadata.ci.commitHash`
refers to its synthetic PR merge and is not substituted for the tested revision.

Reports: `playwright-report/index.html`, `test-results/browser-results.json`,
`test-results/feature-upgrade.json`, operations/restore JSON under `test-results/`.
Private keys, captured account links, database dumps and backup credentials remain
under ignored `test-results/tls/`, excluded from publication. Historical reports
remain attributed to their earlier revisions.

## Inspected Captures

Ten selected fictional-data screenshots were visually inspected and retained in
[assets/screenshots/feature-release](assets/screenshots/feature-release/), without
overwriting historical captures:

| Directory / filenames                                           | Scenario / viewport                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `69ca377/delivery-awaiting-client.png`, `delivery-accepted.png` | Same-project release, scope approval, accepted revision while ticket stays open; 1280 x 900, full page |
| `69ca377/client-decision-mobile.png`                            | Designated reviewer, criteria, owner/date, decisions and export; 390 x 844, section capture            |
| `69ca377/delivery-plan-desktop.png`                             | Factual dated plan, filters, reasons and record links; 1440 x 1000                                     |
| `69ca377/summary-preview.png`                                   | Private draft and explicit publication checkbox; 1440 x 1000, full page                                |
| `69ca377/summary-client-mobile.png`                             | Published client-safe fixed snapshot; 390 x 844, full page                                             |
| `33391a7/admin-dashboard.png`, `developer-dashboard.png`        | Corrected queue-first hierarchy and distinct scope; 1440 x 1000, full page                             |
| `33391a7/client-mobile-dashboard.png`                           | First reply action visible, no staff workload; 390 x 844                                               |
| `33391a7/native-200-delivery.png`                               | Real browser zoom, readable filters and no horizontal page overflow; outer width 1440, 200%            |

## Remaining Acceptance

- Real screen-reader acceptance is outstanding. With NVDA/VoiceOver, navigate
  login and validation messages; read the delivery reviewer/outcome; operate
  agreement/feedback and scope decision radios; inspect revision history; then
  review summary sections and the publication checkbox. Confirm labels, state
  announcements, focus order and return navigation. Automated axe is not this test.
- Trusted public HTTPS, actual SMTP recipients, off-host storage, external alerts,
  recovery ownership and operational sign-off still require the installation guide.
- Portal summaries are not email delivery. Service-information links are not live
  booking or checkout services. Validate the product hypotheses with agencies.
- Earlier edited ticket wording cannot be reconstructed before original-request
  capture. Backup RPO is the dump snapshot; later writes are not included, and
  WAL/PITR is not configured. Future schemas need a fresh compatibility review.
