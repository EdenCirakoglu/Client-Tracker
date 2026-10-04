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
```

The fixture upgrades populated legacy data without reseeding existing databases.
Only the new nullable original-request columns are excluded from pre/post upgrade
comparisons; all existing business fields are compared. Restore fingerprints
include all workflow tables and fields. An older application image does not undo
migrations or support the new workflow; rollback must follow the reviewed runbook.

## Results

Verification in progress. Do not treat this checkpoint as a verified release.
API source revision `61c033623618ad0a790fcfc9d11bdfbac3ab14bf`: full local
suite **111 passed across 14 files**, 214.36s. Focused security/workflow run:
**24 passed**, 107.52s, including three invitation and three reset concurrency
rounds. Lint, typecheck and formatting passed. The old intermittent 503 did not
recur; its original database error was not retained, so no precise cause is claimed.
Frozen installation and checkpoint patch/history secret scans passed. Browser
report validation now fails for missing, malformed, empty, stale or private
reports; failed test reports can still be retained safely without making CI pass.
The 25 verification helper tests passed after adding these checks.

Reports: `playwright-report/index.html`, `test-results/browser-results.json`,
`test-results/feature-upgrade.json`, operations/restore JSON under `test-results/`.
Private keys, captured account links, database dumps and backup credentials remain
under ignored `test-results/tls/`, excluded from publication. Historical reports
remain attributed to their earlier revisions.

Real screen-reader acceptance remains outstanding. Portal summaries are not email
delivery. Service-information links are not live booking or checkout services.
