# Delivery Planning Verification

## Revision

Local work on `feature/request-acceptance`, based on
`40e8bfe038573ebfe40de818b7e21e6359d6e3d3` plus uncommitted workflow, licensing and
delivery-planning changes. This does not verify the unchanged base SHA or a registry
image. Earlier [workflow results](PRODUCT_WORKFLOWS_VERIFICATION.md) remain evidence
for that earlier working tree; hosted release evidence is not relabelled.

## Isolation

The existing disposable container `clientops-delivery-test-postgres` on loopback
55439 hosts the API test database `clientops_delivery_test` and separate populated
preview `clientops_delivery_capture_demo`. No development or previous verification
database is reset. The preview has 2 clients, 4 users, 3 projects, 9 tickets, 5 comments,
7 ticket events, 2 releases, 4 suggestions, 2 delivery revisions, 8 delivery events,
2 scope proposals and 1 summary before this increment's browser fixtures.

Before and after the first full API regression, the preview business-data fingerprint
was identical: `b86afd6422383c30e87b673f7ce96432de29622e33ca06106a614fe1b1f6dea5`.
This confirms those tests did not put records into or reset the preview database.

## Checks

- Initial focused delivery-plan API suite: 7 passed.
- First full run: 100 passed, one existing login-rate-limit test exceeded its unchanged
  20-second timeout (367.32 seconds total).
- Second full run: 100 passed / 102 total (379.60 seconds). The same timeout occurred,
  plus one concurrent invitation attempt returned 503 instead of the expected 400.
- Isolated unchanged security file: 14 passed / 15 total (119.54 seconds); invitation
  concurrency passed, rate-limit test still timed out. No authentication checks,
  password cost, timeouts or assertions were weakened to obtain a passing result.
- Guarded local rate-boundary diagnostic: 20 responses were 401, attempt 21 was 429
  with Retry-After, and 3 persistent buckets existed. It completed in **27,321ms**.
  Five standalone cost-12 bcrypt comparisons took **5,036ms** on this host. This
  demonstrates the rate boundary but does not turn the failed suite into a pass.
  Diagnostic command: `pnpm exec tsx test-results/rate-boundary.ts` from `apps/api/`,
  with `NODE_ENV=test`, the explicit test URL/name and disposable session secret.
  This guarded diagnostic is an ignored local artifact, not an application change.
- Lint, TypeScript and 22 verification helper tests passed at the initial check.
- Populated preview upgrade: migration 0006 passed without reseeding. A second hash
  excluding only the three newly added columns exactly matched the original fingerprint
  above, with all counts unchanged. Existing business fields and decisions survived.
- Final focused regression/build/browser results: verification in progress.
- Hosted CI, published application images and public deployment: not run for this increment.
- Real screen reader and native 200% browser zoom: manual acceptance outstanding.

## Reproduction

Start in `clientops-tracker/` with Node 24, pnpm 9, Docker Desktop and installed Chrome
(or Playwright Chromium). The isolated fixture creation and proxy setup are documented
in [the prior local workflow verification](PRODUCT_WORKFLOWS_VERIFICATION.md#reproduction).
The passwords below are disposable fixture values, never production credentials.

```powershell
$env:TEST_DATABASE_URL = 'postgresql://clientops_test:disposable_test_password@localhost:55439/clientops_delivery_test'
$env:DISPOSABLE_DATABASE_NAME = 'clientops_delivery_test'
$env:SMTP_PORT = '11039'
$env:MAILPIT_URL = 'http://localhost:18039'
pnpm test
pnpm test:verification
pnpm lint
pnpm typecheck
pnpm format:check
```

Upgrade the populated preview without seeding:

```powershell
$env:DATABASE_URL = 'postgresql://clientops_test:disposable_test_password@localhost:55439/clientops_delivery_capture_demo'
$env:DISPOSABLE_DATABASE_NAME = 'clientops_delivery_capture_demo'
$env:NODE_ENV = 'development'
$env:DEMO_MODE = 'true'
pnpm db:migrate
$env:NEXT_PUBLIC_API_URL = 'http://localhost:8139'
pnpm build
```

Run the built API and Next.js processes on 8139/3139 behind the existing isolated
8189 proxy as documented in the prior verification. API settings are
`APP_ORIGIN=http://localhost:8189`, `API_ORIGIN=http://localhost:8139`,
`SMTP_MODE=capture`, `SMTP_HOST=localhost`, `SMTP_PORT=11039` and a random session secret.
The API database URL above uses a **host** port, not the container hostname `postgres`.
This HTTP preview does not establish production HTTPS-cookie acceptance.

```powershell
$env:VERIFY_URL = 'http://localhost:8189'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
$env:E2E_SCREENSHOT_DIR = 'docs/assets/screenshots/delivery-planning/after'
pnpm test:e2e e2e/delivery-planning.spec.ts
# Run regression scenarios with captures in a separate ignored directory:
$env:E2E_SCREENSHOT_DIR = 'test-results/delivery-planning-regressions'
pnpm test:e2e e2e/product-workflows.spec.ts e2e/portal.spec.ts e2e/dashboard.spec.ts e2e/usability.spec.ts
```

Browser tests create fictional records. Do not use a real client database. Account
HTTPS scenarios still require the separate HTTPS/account fixture; this run does not
claim their browser results. The API suite retains session/account/tenant coverage.

## Screenshots and Manual Acceptance

Before captures in `docs/assets/screenshots/delivery-planning/before/`: dashboard,
projects and populated ticket, all at 1440 x 1000. All three were inspected; the
dashboard/ticket were recaptured after loading completed. Historical captures outside
this new directory were preserved.

The new browser scenario captures administrator, developer and client dashboards,
dated outcome proposal, full delivery plan, mobile client plan/decision and dark theme.
Final capture/report locations and inspected results are recorded after execution.

Manual steps, including screen-reader checks, are in
[DELIVERY_PLANNING.md](DELIVERY_PLANNING.md#manual-acceptance). Validate the language,
approval ownership and commercial hypothesis with agency users before expanding scope.
