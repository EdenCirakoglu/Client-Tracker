# Operations Review Evidence

Status: in review preparation on `review/production-operations`, based on merged `bdc749421187c017f4cc3ba36b2b9ef1d09fda80`. No merge, history rewrite, public deployment, DigitalOcean trigger or real email is authorised/performed in this phase. The [published-release verification](RELEASE_BDC749.md) remains attributed only to `bdc7494`; older `3fa8d7f` evidence is unchanged.

## Scope and Initial Local Results

- [Public information audit](PUBLIC_INFORMATION.md): portable docs, repository-local GitHub noreply identity, reachable-history Gitleaks gate, fixture-specific exceptions and browser-artifact identity metadata prevention. Historical email removal options are documented but not executed.
- Database readiness now fails independently of process liveness. An actual checked-out connection termination initially crashed the process; a regression test and client error handling fixed it. The first SMTP drill also exposed cached proxy addresses; Docker DNS re-resolution and bounded proxy checks fixed that failure.
- Initial working-tree drill (base checkout `827532e` plus then-uncommitted changes, **not a clean revision claim**), 2026-09-14: readiness 503 in 762ms, authenticated request 503 in 6016ms, process liveness 200 and subsequent recovery 200. Mailpit outage persisted retry state; API restart and concurrent worker delivered the same invitation once; stale reset rejected and password reset revoked the session.
- Initial populated backup/restore under the same working-tree qualification: eight business tables and all foreign-key constraints verified; source unchanged; session/link replay rejected; login and two-organisation boundary passed. Dump took 589ms, restored startup 22603ms on this small local fixture. Pinned `bdc7494` API/web rollback preserved the restored comment and business hashes. These timings are not production RTO promises.
- Screen-reader acceptance remains manual; automated/browser results are recorded separately below.

## Reviewed Local Revision

Clean application/harness revision `77236fc6bfb31af3dafff0e7cbbee927776485f6` was rebuilt and run in the ops fixtures. The native-zoom/axe/keyboard acceptance passed on Chrome 153.0.8010.37: physical outer width stayed 1440, CSS width changed 1422 to 711 and device pixel ratio changed 1 to 2 through Chrome Settings, not CSS zoom. The original Playwright zoom capture clipped the browser surface; direct CDP surface capture corrected that evidence artifact without changing layout.

The same clean revision's PostgreSQL/Mailpit runtime drill passed: readiness 503 in 761ms, authenticated request 503 in 2013ms, liveness 200 and recovery 200; persisted retry, restart, concurrent worker, stale link rejection and reset revocation passed. The bounded maintenance executable also ran successfully on the disposable database.

All nine existing browser/axe scenarios passed locally in 1.4 minutes on the preceding UI build; the later clean-revision native script verifies the final age wording and capture path. Local lint, typecheck, 75 API/configuration tests, both builds, formatting and both Compose validations passed. CI separately repeats the entire suite from checkout; these are not claims that local runs used the CI-produced images.

Inspected before/after evidence includes desktop tickets, admin/developer/client dashboards, 390px dashboards/tickets, ticket detail, full native 200% dashboard and keyboard-focused account form. Desktop descriptions are a one-line preview (full text remains in detail), dates retain the full date in a `time` title, status/priority remain inline on mobile, and the first Review/Open-and-reply action is checked in the mobile viewport. Age under a day is labelled `Opened under 24h ago`, not `0d` or an inaccurate calendar-day claim.

Local runtime image IDs: API `sha256:fd0955507ba715428e83bc8bdacdb46e622914e97362d49e58830a729becb30d`; web `sha256:24eff003c48be9670777435220ea491a96a0c4ff9853646339361c1e533bd81d`. These are local images, **not new GHCR publication evidence**.

## Reproduce Without Touching Earlier Databases

Run from the nested pnpm workspace after `pnpm install --frozen-lockfile`. Requirements: Node 24, pnpm 9.15.4, Docker/Linux containers, OpenSSL and Chrome locally; CI installs full Chromium. A corporate CA may be supplied via the existing optional `BUILD_CA_FILE` BuildKit-secret path.

```powershell
node scripts/hardening-stack.mjs start --ops
$env:TEST_PG_PORT='55435'
$env:TEST_SMTP_PORT='11026'
$env:TEST_MAIL_PORT='18026'
docker compose -p clientops-ops-tests -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@localhost:55435/clientops_hardening_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_hardening_test'
$env:SMTP_MODE='capture'
$env:SMTP_HOST='localhost'
$env:SMTP_PORT='11026'
$env:MAILPIT_URL='http://localhost:18026'
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
$env:BROWSER_CHANNEL='chrome'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8452'
$env:ACCOUNT_SETUP_URL='https://localhost:8453'
$env:ACCOUNT_MAIL_URL='http://localhost:8033'
$env:E2E_SCREENSHOT_DIR='test-results/operations-screenshots'
pnpm test:e2e
node scripts/verify-ui-acceptance.mjs
node scripts/verify-operations.mjs --ops
node scripts/verify-restore.mjs --ops
node scripts/secret-scan.mjs
docker compose config --quiet
docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet
```

The restore script creates a **new** uniquely named project/volume and ephemeral loopback port on every run, then stops its services without deleting the volume. It uses the API/web image IDs already built by the ops helper, not a local rebuild during restore; its rollback pair is pulled by the recorded immutable `bdc7494` digests. New demo data is seeded only when the specifically designated ops fixture is entirely new. Do not run any reset against development or older verification databases.

CI uses a fresh checkout and fresh `clientops-hardening`/`clientops-accounts` fixtures on an ephemeral runner, so the same scripts omit `--ops`. CI retains lint, typecheck, formatting, isolated tests, builds, both Compose checks and all existing browser/axe scenarios, plus the privacy scan, native zoom, outage and restore checks.

## Reports and Manual Acceptance

- `playwright-report/index.html`, `test-results/browser-results.json`: existing browser scenarios, not API-test output.
- `test-results/ui-before/`: pre-refinement captures; one initial loading-state capture was corrected by waiting for loaded records.
- `test-results/ui-acceptance/`: focused after captures, native browser zoom and acceptance JSON.
- `test-results/operations-runtime.json`, `restore-runtime.json`, `ops-upgrade.json`: exact runtime checks and image/revision provenance.
- `test-results/tls/`: **private**, ignored and excluded from CI artifacts. Contains local keys, generated configs and sensitive backup archives; never attach it to a PR.

Manual launch acceptance still required: real screen reader (NVDA/VoiceOver) login, ticket/list filters, menu/drawer and account recovery; trusted external HTTPS/renewal; real SMTP sender/bounce configuration; least-privilege DB roles; encrypted off-host backup/restore; monitoring and alert delivery; operator access/retention policies. See [operations runbook](OPERATIONS.md). Logical-backup RPO is the snapshot boundary, not zero loss. The old pinned session release lacks the new outbox/readiness capabilities, so rollback suspends account-delivery actions until roll-forward.

## Draft PR and Hosted CI

[Draft PR #4](https://github.com/EdenCirakoglu/Client-Tracker/pull/4) preserves separate privacy/release/readiness/backend/UI commits. It must remain unmerged.

[First hosted attempt 34834958998](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34834958998), revision `9f94b2ff34128b21a11a59cad31942cce6d9fc41`, passed source gates, 75 tests, builds, Compose, nine browser scenarios, native zoom and the outage drill, but **failed restore preconditions**. Polling could select an older consumed reset message before the new one arrived. The harness now excludes all pre-existing message IDs and retains the assertion that the new token is live in PostgreSQL before backup. A local rerun with that harness correction passed (dump 301ms; restored startup 22322ms), without removing any check. That rerun used `77236fc` application images plus the then-uncommitted harness correction.

The [PR checks](https://github.com/EdenCirakoglu/Client-Tracker/pull/4/checks) identify each subsequent tested head and its immutable report artifact. Final hosted results will be recorded after the corrected head completes. New branch image publication and public deployment are intentionally not performed.
