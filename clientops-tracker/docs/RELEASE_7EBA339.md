# Published Release: 7eba339

Verified application revision: `7eba339b37a2aa948ef4f6ed019d268816d4ec99`, the normal merge of [PR #4](https://github.com/EdenCirakoglu/Client-Tracker/pull/4). Public deployment has not occurred.

## Hosted Evidence

- [Main CI 34845781340](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34845781340) checked out this exact revision. Lint, typecheck, formatting, 75 API tests, eight verification-helper tests, builds, Compose validation, nine browser scenarios, native zoom, outage and restore checks passed.
- Browser artifact `10347974373`, SHA-256 `668a42ea73e5ae7f236418b6acce125bdccadcbafdd3efc085597e959fc3a436`.
- [Image publication 34846523380](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34846523380): both jobs succeeded for this revision. Publication is not public deployment and does not itself verify a running stack.

## Published Images

Both full-SHA tags were pulled and OCI revision labels inspected. Both images run as `node`. Registry manifest digests match the publishing logs:

| Image | Immutable reference                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------------------------ |
| API   | `ghcr.io/edencirakoglu/client-tracker-api@sha256:f89b550bd3c3166ee4be56a9a8d6a64950f53b7482edc65394a313ca66e512df` |
| Web   | `ghcr.io/edencirakoglu/client-tracker-web@sha256:780012866bcf3ac9a3155290ff3d3ad7ab14019c7b22d851629f90eddaf2cb39` |

## Separate Local Runtime Verification

On 2026-09-14, these **published images**, without local rebuilding, passed in new `clientops-release-7eba339` and `clientops-release-7eba339-accounts` Compose projects. Each has its own named PostgreSQL volume. No development or prior verification volume was reset or removed.

- In-image migrations, startup/readiness and one-time non-demo bootstrap passed.
- Nine existing Chrome browser/axe scenarios passed (1.4 minutes): account setup, recovery, Secure/HttpOnly cookies, logout replay, role queues, URL filters, preferences, tickets/comments and persisted/idempotent triage.
- Paused PostgreSQL returned readiness 503 in 762ms; liveness stayed 200; authenticated access failed safely with 503 in 6013ms; readiness and the session recovered after unpause.
- Stopped Mailpit persisted a failed invitation attempt. API restart plus a second worker retried the same token and delivered one captured message. Stale reset rejection, password-reset session revocation and log redaction passed. This is local SMTP capture, not external SMTP delivery evidence.
- Eight business-table count/hash pairs were unchanged after full container recreation in both projects. Existing session/ticket persistence, two-organisation direct-access boundaries, public-only client comments and logout replay rejection passed.

Harness checkout was `7eba339` with the explicit release-fixture extensions then uncommitted. This qualification applies to the harness only; application images were immutable registry digests above. Earlier `bdc7494`, `3fa8d7f` and PR-head evidence remains attributed to those revisions.

## Exact Commands Run

From the nested `clientops-tracker` workspace, with Node 24, pnpm 9.15.4, Docker Linux containers, OpenSSL and installed Chrome:

```powershell
docker pull ghcr.io/edencirakoglu/client-tracker-api:7eba339b37a2aa948ef4f6ed019d268816d4ec99
docker pull ghcr.io/edencirakoglu/client-tracker-web:7eba339b37a2aa948ef4f6ed019d268816d4ec99
node scripts/verify-published.mjs start --release=7eba339
$env:BROWSER_CHANNEL='chrome'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8454'
$env:ACCOUNT_SETUP_URL='https://localhost:8455'
$env:ACCOUNT_MAIL_URL='http://localhost:8035'
$env:E2E_SCREENSHOT_DIR='test-results/release-7eba339/screenshots'
pnpm test:e2e
node scripts/verify-operations.mjs --published=7eba339
node scripts/verify-release-persistence.mjs --release=7eba339
```

The helper uses the Compose hostname `postgres` internally, loopback HTTPS ports 8454/8455 and Mailpit ports 8034/8035. It generates random fixture secrets and expiry-aware self-signed certificates under ignored `test-results/tls/release-7eba339/`. Do not upload that private directory. Browser certificate exceptions are restricted to these disposable loopback fixtures.

These are historical commands for the nine-scenario suite. To replay them, use the committed release-harness checkpoint `2ad262b8f924c899b05c77034e77616519dabe4c` in a separate worktree and install its frozen dependencies. The newer ten-scenario follow-up suite expects changed account labels and must not be presented as passing against the old published UI. The local release fixture ports must be available or deliberately reused; never reset a database to make a replay pass.

Local reports: `test-results/release-7eba339/{start,operations-runtime,persistence,acceptance,browser-results}.json` and the preserved `playwright-report/index.html` under that directory. Fresh UI before-captures are in `ui-before/` and `ui-before-short/`; they are not screenshots of follow-up changes.

Follow-up usability and operator controls belong to a new draft PR. Trusted external HTTPS, SMTP, off-host storage and alert destinations remain operator configuration, not claims made by this release check.
