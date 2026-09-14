# Operations Review Evidence

Status: draft [PR #4](https://github.com/EdenCirakoglu/Client-Tracker/pull/4) on `review/production-operations`, based on merged `bdc749421187c017f4cc3ba36b2b9ef1d09fda80`. Implementation revision `1a651224be7f2f1095ec164e0e255096332c3b08` passed hosted CI. No merge, history rewrite, public deployment, DigitalOcean trigger or real email is authorised/performed in this phase. The [published-release verification](RELEASE_BDC749.md) remains attributed only to `bdc7494`; older `3fa8d7f` evidence is unchanged.

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

### Passing Implementation Revision

[Hosted CI 34835839755](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34835839755) passed on 2026-09-14 for clean head `1a651224be7f2f1095ec164e0e255096332c3b08`, including the corrected mail polling assertion. The workflow explicitly checks out the PR head, not GitHub's synthetic merge revision. Playwright's automatic CI context also names that synthetic merge; `metadata.revision` and every runtime report identify the actual checked-out head.

| Gate                  | Actual hosted result                                                                                                                                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Privacy               | 33 non-empty reachable commits scanned, no unexcepted Gitleaks findings; portable-path and browser-metadata checks passed.                                                                                                                        |
| Source                | Frozen install, lint, typecheck, formatting, migration and both builds passed.                                                                                                                                                                    |
| API/configuration     | 75 tests in nine files passed; 49.61s; isolated PostgreSQL and Mailpit.                                                                                                                                                                           |
| Compose               | Both configuration validations passed; separate runner-built HTTPS stacks started successfully.                                                                                                                                                   |
| Browser/accessibility | Nine passed, zero failed/skipped/flaky; 77.423s; existing account, role, queue, history and triage checks retained.                                                                                                                               |
| Native zoom           | Chromium 153.0.8010.12, 100% to 200% via browser settings; CSS width 1440 to 720, DPR 1 to 2; keyboard/axe acceptance passed.                                                                                                                     |
| Database outage       | Liveness 200; readiness 503 in 755ms; authenticated request 503 in 6004ms; readiness recovered to 200.                                                                                                                                            |
| Durable mail          | SMTP failure persisted; restart and concurrent worker recovery passed; same token retried; one message observed; stale link and old session rejected; logs redacted. At-least-once delivery can still duplicate after an acknowledgement failure. |
| Restore               | Eight business tables and relationships preserved; restored sessions/links invalid; login/tenant checks passed; source unchanged. Dump 203ms, restored startup 16652ms on this small fixture.                                                     |
| Pinned rollback       | Previously published session-era `bdc7494` digests ran against the additive schema without rebuilding; records and comment preserved.                                                                                                             |

The [downloaded evidence artifact 10344580835](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34835839755/artifacts/10344580835) has SHA-256 `02355bd1859cdba6464f5f9b4a2f74c2d280f02318627153e3d391e9b2938977`; scheduled expiry is 2026-12-13. Its 75 files contain no `tls` directory, key, PEM, dump, SQL or actual environment files. A separate redacted Gitleaks scan found no candidates; exact matching of historical personal-email values in the six unpacked text/JSON/HTML files found no matches. No automatic Git identity/diff metadata is present. This is bounded artifact inspection, not a universal absence-of-secrets claim.

Runner-built runtime image IDs: API `sha256:a64132031ce4bcdf54c1e6ec85d26f2c03c1a2219885df008e7f65982ad0b931`, web `sha256:2619be613d02803fb07ee91045b02554eaa60c7cad7d87f4a550c54f62f54ac1`. They are **CI-local builds**, not published branch images. The immutable rollback digests and restored-fixture details are in `test-results/restore-runtime.json` within the artifact.

This evidence-only documentation commit follows the tested implementation head. The [PR checks](https://github.com/EdenCirakoglu/Client-Tracker/pull/4/checks) identify subsequent head checks and their separate artifacts; the results above remain attributed to `1a65122`. The [inspected local screenshots](SCREENSHOTS.md#operations-acceptance-2026-09-14) retain their own `77236fc` provenance. New branch image publication and public deployment are intentionally not performed.
