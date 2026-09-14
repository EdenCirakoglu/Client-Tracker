# Operations Review Evidence

Status: in review preparation on `review/production-operations`, based on merged `bdc749421187c017f4cc3ba36b2b9ef1d09fda80`. No merge, history rewrite, public deployment, DigitalOcean trigger or real email is authorised/performed in this phase. The [published-release verification](RELEASE_BDC749.md) remains attributed only to `bdc7494`; older `3fa8d7f` evidence is unchanged.

## Scope and Initial Local Results

- [Public information audit](PUBLIC_INFORMATION.md): portable docs, repository-local GitHub noreply identity, reachable-history Gitleaks gate, fixture-specific exceptions and browser-artifact identity metadata prevention. Historical email removal options are documented but not executed.
- Database readiness now fails independently of process liveness. An actual checked-out connection termination initially crashed the process; a regression test and client error handling fixed it. The first SMTP drill also exposed cached proxy addresses; Docker DNS re-resolution and bounded proxy checks fixed that failure.
- Initial working-tree drill (base checkout `827532e` plus then-uncommitted changes, **not a clean revision claim**), 2026-09-14: readiness 503 in 762ms, authenticated request 503 in 6016ms, process liveness 200 and subsequent recovery 200. Mailpit outage persisted retry state; API restart and concurrent worker delivered the same invitation once; stale reset rejected and password reset revoked the session.
- Initial populated backup/restore under the same working-tree qualification: eight business tables and all foreign-key constraints verified; source unchanged; session/link replay rejected; login and two-organisation boundary passed. Dump took 589ms, restored startup 22603ms on this small local fixture. Pinned `bdc7494` API/web rollback preserved the restored comment and business hashes. These timings are not production RTO promises.
- Browser/native-zoom and final clean-revision CI results are pending and must be recorded below after execution. Screen-reader acceptance remains manual.

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

Pending creation and execution. Local runtime success must not be labelled hosted CI success. New branch image publication and public deployment are intentionally not performed.
