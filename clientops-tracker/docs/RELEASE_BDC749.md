# Published Session Release: bdc7494

Application revision: `bdc749421187c017f4cc3ba36b2b9ef1d09fda80`, normal merge of [PR #3](https://github.com/EdenCirakoglu/Client-Tracker/pull/3). Verified 2026-09-13. Prior evidence retains its original revisions.

## Hosted Results

- [Main CI 34767427740](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34767427740): successful. Exact SHA confirmed in logs; all source gates, 60 API tests, builds, Compose and nine browser scenarios passed.
- [Publication 34767742682](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34767742682): both API and web jobs successful for that SHA.
- [Browser artifact 10320699009](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34767427740/artifacts/10320699009): nine passed, zero failed/skipped/flaky, 77.218508s. Download SHA-256 `a273b3fbd1a8dc2d170148ea0a68c286ab6d2a453d480812020d62d077fc0762`. [Privacy review](PUBLIC_INFORMATION.md) found automatic Git identity metadata; the original artifact has not been deleted or relabelled.

## Published Images

Full-SHA tags were pulled and run by immutable digest without rebuilding. OCI revision labels match the SHA above; both run as non-root `node`, Linux/amd64.

```text
ghcr.io/edencirakoglu/client-tracker-api@sha256:c3e3c6e4e0d0166e54c734f29bd9270ba4fdaa8a4649ed052b1539a12da36e83
ghcr.io/edencirakoglu/client-tracker-web@sha256:1d81853b12c29c73ac402160d6fff05d76a4fd71fbb84434730587a178059f79
```

## Local Results

New projects `clientops-release-bdc749` and `clientops-release-bdc749-accounts` use independent named volumes. Only loopback HTTPS 8450/8451 and Mailpit 8030/8031 are exposed. Existing databases were not migrated, seeded or reset.

- In-image migration, empty disposable demo population and one-time non-demo owner bootstrap passed. An initial seed attempt under `NODE_ENV=production` was correctly rejected. The helper now explicitly seeds only a completely empty disposable fixture under `NODE_ENV=development`.
- Nine unchanged Chrome/axe scenarios passed, zero failures/skips/flaky, 198.241239s, starting `2026-09-13T17:04:41.999Z`. Invitation/setup/recovery/password change, secure cookies, role boundaries, URL filters, themes, keyboard navigation, ticket/comment history and persisted triage were exercised.
- Harness checkout was `c352354` plus verification helper changes, not a clean application build. Image digests establish application provenance independently. Local JSON SHA-256: `db75d6a4fe308210deb6073f52b388e17091a66026a02e24c1f47aa6d8584a1a`.
- Additional API checks passed: disjoint project sets for two organisations, foreign project/ticket denial, public-only client comments and no client developer workload.
- All eight business-table fingerprints matched after full recreation of both stacks without deleting volumes. An existing session and ticket survived; logout then made replay of the same cookie return 401. Acceptance time: `2026-09-13T17:11:14.920Z`.

Ignored local evidence: `test-results/release-bdc749/{start,persistence,acceptance,browser-results}.json` and `screenshots/`. HTML: `playwright-report/index.html` (later tests replace it). Hosted CI builds its own images; the results here separately verify GHCR downloads. Self-signed loopback TLS is not trusted public HTTPS. No production email, public deployment or DigitalOcean run occurred.

## Reproduce

From the pnpm workspace with Docker/Linux containers, Node 24, pnpm 9, OpenSSL and installed Chrome:

```powershell
node scripts/verify-published.mjs start
$env:BROWSER_CHANNEL='chrome'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8450'
$env:ACCOUNT_SETUP_URL='https://localhost:8451'
$env:ACCOUNT_MAIL_URL='http://localhost:8031'
$env:E2E_SCREENSHOT_DIR='test-results/release-bdc749/screenshots'
pnpm test:e2e
node scripts/verify-release-persistence.mjs
```

The helper has no build/reset command, refuses mismatched image revisions and writes ignored generated configuration with a random session secret. Later application test changes may require their own fixture; this document records the baseline run, not an assertion about future tests against old images.
