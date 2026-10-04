# Product Workflow Verification

## Revision and Scope

Verified locally on 2026-09-23. Feature branch: `feature/request-acceptance`, based on `40e8bfe038573ebfe40de818b7e21e6359d6e3d3` plus the uncommitted product-workflow changes. This is **not** verification of the unchanged base commit or of a published image. No historical PR, CI, registry or deployment evidence is relabelled.

The work adds delivery agreement/acceptance, immutable scope proposal revisions, client-safe exports and previewed portal summaries. See [functional design and manual acceptance](PRODUCT_WORKFLOWS.md).

## Local Environment

- Windows, Node 24, pnpm 9.15.4, Docker Desktop, PostgreSQL 16, Mailpit and installed Chrome with isolated profiles.
- Existing development and prior verification containers/volumes are unchanged.
- New ephemeral database container: `clientops-delivery-test-postgres`, loopback port `55439`, tmpfs storage. API tests use `clientops_delivery_test`; the nine browser regressions used `clientops_delivery_demo`. The final clean-data capture and running preview use a third database, `clientops_delivery_capture_demo`. None of these is the existing development/demo database. Stopping this ephemeral container loses its tmpfs data.
- New fictional mail capture container: `clientops-delivery-test-mail`, SMTP `11039`, UI `18039`.
- Built local API at `8139`, built Next.js frontend at `3139`, separate loopback Nginx proxy `clientops-delivery-preview-proxy` at `8189`.
- Preview: <http://localhost:8189>. This is HTTP development-mode API verification, **not** production HTTPS/session-cookie acceptance. Previous HTTPS/security coverage remains in the test suite and its historical evidence.
- Docker Compose initially failed to allocate a new network because the local automatic subnet pool was exhausted. The two uniquely named ephemeral containers instead use Docker's existing default bridge. No existing network was deleted or pruned.

No personal browser profile, real recipient email, public deployment or published application image was used.

## Results

| Check                                                        | Result                                                                                                                                                                                                     |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Additive Drizzle migrations and fresh fictional preview seed | Passed on the new preview database only                                                                                                                                                                    |
| Delivery and scope/summary API tests                         | 16 passed                                                                                                                                                                                                  |
| Full API suite                                               | 94 passed across 12 files (193.93 seconds). A prior run overlapping the build had 93 passes and one existing login-rate-limit test timeout; the complete rerun passed without changing the timeout or test |
| Lint and TypeScript                                          | Passed                                                                                                                                                                                                     |
| API/web production builds                                    | Passed, including all three summary routes                                                                                                                                                                 |
| Verification helper tests                                    | 22 passed                                                                                                                                                                                                  |
| New browser workflow and axe                                 | Passed in the combined run and again on clean capture data (48.2 seconds). Reflow checked at 390, 768, 1280 and 1440px, with light/dark themes                                                             |
| Existing portal/dashboard/mobile browser regressions         | All 9 scenarios passed (5.4 minutes), including the new workflow, ticket/comment/triage persistence, tenant scope, URL filters, mobile navigation, error states and logout                                 |
| Formatting                                                   | Passed                                                                                                                                                                                                     |
| Hosted CI / published images / public deployment             | Not run for this local increment                                                                                                                                                                           |
| Screen reader / native 200% zoom of new screens              | Manual acceptance outstanding                                                                                                                                                                              |

## Reproduction

All commands below start in the pnpm workspace (`clientops-tracker/`), not the outer Git root. Fixture passwords are explicitly disposable and must never be used in production.

The containers used in this run were created as follows. Do not recreate or remove them while using the running preview:

```powershell
docker run -d --name clientops-delivery-test-postgres --network bridge --tmpfs /var/lib/postgresql/data -p 127.0.0.1:55439:5432 -e POSTGRES_USER=clientops_test -e POSTGRES_PASSWORD=disposable_test_password -e POSTGRES_DB=clientops_delivery_test postgres:16-alpine
docker run -d --name clientops-delivery-test-mail --network bridge -p 127.0.0.1:11039:1025 -p 127.0.0.1:18039:8025 axllent/mailpit:v1.27.4
docker exec clientops-delivery-test-postgres createdb -U clientops_test clientops_delivery_demo
docker exec clientops-delivery-test-postgres createdb -U clientops_test clientops_delivery_capture_demo
```

API regression commands, deliberately targeting only the new disposable test database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://clientops_test:disposable_test_password@localhost:55439/clientops_delivery_test'
$env:DISPOSABLE_DATABASE_NAME = 'clientops_delivery_test'
$env:SMTP_PORT = '11039'
$env:MAILPIT_URL = 'http://localhost:18039'
pnpm test
pnpm lint
pnpm typecheck
pnpm test:verification
pnpm format:check
```

The final browser preview database was migrated and seeded only immediately after creation:

```powershell
$env:DATABASE_URL = 'postgresql://clientops_test:disposable_test_password@localhost:55439/clientops_delivery_capture_demo'
$env:DISPOSABLE_DATABASE_NAME = 'clientops_delivery_capture_demo'
$env:NODE_ENV = 'development'
$env:DEMO_MODE = 'true'
$env:SEED_RESET = 'true'
pnpm db:migrate
pnpm db:seed
Remove-Item Env:SEED_RESET
$env:NEXT_PUBLIC_API_URL = 'http://localhost:8139'
pnpm build
```

The preview API runs the built `apps/api/dist/server.js` with the above database configuration,
`PORT=8139`, `APP_ORIGIN=http://localhost:8189`, `API_ORIGIN=http://localhost:8139`,
`SMTP_MODE=capture`, `SMTP_HOST=localhost`, `SMTP_PORT=11039` and a newly generated
session secret. Next.js runs `next start -p 3139`. The local Nginx proxy sends `/api/`
and `/health` to `host.docker.internal:8139`, and other paths to `host.docker.internal:3139`.
The configuration is in the ignored local file `test-results/delivery-nginx.conf`.
These are host-running application builds behind a container proxy, not application-image verification.

Browser commands against the running preview:

```powershell
$env:VERIFY_URL = 'http://localhost:8189'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
$env:E2E_SCREENSHOT_DIR = 'docs/assets/screenshots/product-workflows'
pnpm test:e2e e2e/product-workflows.spec.ts e2e/portal.spec.ts e2e/dashboard.spec.ts e2e/usability.spec.ts
# Separate clean-data capture rerun:
pnpm test:e2e e2e/product-workflows.spec.ts
```

The nine-scenario report is preserved locally at `test-results/product-regression-report/index.html`
and `test-results/product-regression-results.json`. The final one-scenario capture report is at
`playwright-report/index.html`, `test-results/browser-results.json` and `test-results/browser/`.
The browser reports record the base Git revision and `workingTreeDirty: true`; they are not evidence
for the unchanged base revision. The new test creates fictional records and captures its own fixtures;
do not point it at a real organisation database. Existing portal/dashboard tests also mutate fictional
records. Account HTTPS scenarios need the separate HTTPS/account fixture described in
[SESSION_HARDENING.md](SESSION_HARDENING.md), not this HTTP preview.

For ordinary development on your existing local demo, first check the API `.env` points to the intended local database, then run:

```powershell
pnpm db:up
pnpm db:migrate
pnpm dev
```

Open <http://localhost:3000>. **Do not reseed an existing database.** The migrations preserve tickets, comments, accounts and earlier history. The disposable preview was seeded only when newly created.

## Captures

Current, fictional-data captures live in `docs/assets/screenshots/product-workflows/`. Historical screenshot directories are untouched.

- `delivery-awaiting-client.png`: client confirmation choices at 1280 x 900.
- `delivery-accepted.png`: accepted revision, scope approval and still-open ticket at 1280 x 900.
- `delivery-mobile.png`: readable delivery history at 390 x 844.
- `delivery-dark.png`: scope and accepted delivery at 1440 x 900 in dark theme.
- `summary-preview.png`: internal draft review at 1440 x 1000.
- `summary-client-mobile.png`: published client snapshot at 390 x 844.

All six final product captures above were visually inspected. Full-page image heights exceed the
viewport height; captures start at document origin to avoid stitched sticky headers. Additional
regression captures in this directory are from the separate nine-scenario run, not the clean final
capture database. Historical screenshot directories were not overwritten.

## Remaining Acceptance

- Review/commit the feature changes and run hosted CI before merging or publishing images.
- Summary publication is in-portal only. Scheduled sending and summary email are future increments, not implemented controls.
- Existing older ticket text cannot be reconstructed before immutable request capture was introduced.
- Confirm workflow language, approver ownership and willingness to pay with agencies. No SLA, billing, legal-signature or revenue claims are made.
- Run a real screen-reader walkthrough: navigate to the delivery section, read the reviewer and criteria, operate the decision radios and submit feedback; then review the scope form and summary publication checkbox. Check native 200% zoom with the browser's own zoom controls and verify focused controls remain visible.
