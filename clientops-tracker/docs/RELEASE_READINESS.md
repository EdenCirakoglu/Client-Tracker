# Release Readiness Evidence

Recorded 2026-09-08. This milestone is a draft PR and verified CI, not a merge,
image release or public deployment.

## Repository and Revisions

- [Draft PR #1](https://github.com/EdenCirakoglu/Client-Tracker/pull/1), branch
  `review/release-readiness-2026-09-08`.
- Git root: `Client Tracker/`; pnpm workspace: `clientops-tracker/`.
- Remote main was verified as `611ca06184e33646ce521e511acf31afacf1cd98`.
  The newer implementation was local staged work, not a hidden remote branch.
- Checkpoint `d79da2c` preserves all 117 reviewed staged files and earlier work.
  Main history was not rewritten. No force push, merge or deployment was performed.
- `aab46bd`: scoped ticket UI, metric definitions and browser report improvements.
- `b2a1ffcb0c08d4dc04be6c0a2e9103308dfe2261`: local four-scenario pass;
  first hosted run exposed a transient enabled-button contrast defect.
- `fe4c4d39b9cb42c46fd4f646f080cdb075274fe8`: fixes the reproduced contrast
  transition and adds an explicit enabled-opacity assertion. Both local and hosted
  checks passed for this application revision.

The index was reviewed from the actual Git root. Real environment files, private
keys, tokens, database dumps, dependencies, builds, reports, browser profiles and
the sibling handoff bundle were excluded. Root workflows and README are included.
See [CHANGE_INVENTORY.md](CHANGE_INVENTORY.md) for the full preserved implementation;
the checkpoint also retains the previous pass's detailed historical report.

## Screenshot Findings

| Finding                        | Investigation and outcome                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Header crosses ticket content  | Reproduced in the old full-page image, not the live viewport. Live scrolling at 0, 300 and 700px kept the header at y=0 with height 64px. The capture had started while scrolled, stitching sticky/fixed chrome into the middle of the document. Capture now resets document scroll to zero; viewport scroll attachments and an unobscured-control assertion are in the browser report. No AppShell redesign. |
| Mobile columns off-screen      | At 390px the bounded table was 356px wide with 984px content. ArrowRight moved scrollLeft from 0 to 40; the far edge was reachable without root overflow. Status and priority now also appear beneath each mobile ticket title. A regression checks initial badge visibility and keyboard access to the far-right Created column.                                                                             |
| Dropdown feedback              | Status, priority and category now announce Saving changes / Changes saved. A nearby alert explains failures, retaining the last persisted value. Real API updates survive refresh. An explicitly injected HTTP 503 verifies unsaved changes are not presented as saved.                                                                                                                                       |
| Open versus workload           | Open counts only OPEN; unresolved adds IN_PROGRESS and WAITING_FOR_CLIENT. Dashboard shows the unresolved total separately. Workload is labelled unresolved and counts assigned outstanding tickets, not only OPEN. Full definitions and the resolution-cycle limitation are in [API.md](API.md#dashboard).                                                                                                   |
| Actual hosted contrast failure | First CI run measured 3.51:1 contrast on an enabled Create ticket button. Local animation-frame sampling reproduced enabled opacity starting at 0.6 and rising to 1. Shared Button now transitions colours only, making enabled opacity immediately 1. The axe rule is retained, not suppressed or delayed.                                                                                                   |

The existing visual design was preserved. No Figma reference was available.
Updated images are listed in [SCREENSHOTS.md](SCREENSHOTS.md), including
ticket-detail, mobile-tickets, mobile-tickets-scrolled, ticket-update-saved and
ticket-update-error. Error evidence is labelled fault injection, not a real outage.

## Checks Actually Run

Windows local checks use Node.js 24, pnpm 9.15.4, Docker Desktop Linux containers
and fresh-profile Chrome. Commands run from the pnpm workspace:

| Command / operation                                                                           | Result                                                                                                                                 |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm.cmd lint`                                                                               | Passed.                                                                                                                                |
| `pnpm.cmd typecheck`                                                                          | Passed, including browser test TypeScript.                                                                                             |
| `pnpm.cmd test`                                                                               | 34 passed across four files (33 baseline plus metric regression). Repeated for demo-isolation verification.                            |
| `pnpm.cmd build`                                                                              | Both API and Next.js production builds passed.                                                                                         |
| `pnpm.cmd format:check`                                                                       | Passed.                                                                                                                                |
| `docker compose config --quiet`                                                               | Passed; configuration validation only.                                                                                                 |
| `docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet` | Passed; configuration validation only.                                                                                                 |
| API/web image build, in-image migration and guarded seed                                      | Passed against the isolated Compose network. Local image tags only.                                                                    |
| `pnpm.cmd test:e2e` on b2a1ffc                                                                | Four passed, 69.0 seconds. Final fe4c4d3 run: four passed in 49.9 seconds, zero skipped/flaky/unexpected. Chrome, not hosted Chromium. |
| Complete demo fingerprint around API tests and container restart                              | Identical; details below.                                                                                                              |

Initial sandboxed test/build invocations could not resolve ancestor paths in
esbuild. Approved unrestricted retries passed; no source workaround or skipped
checks was used. The local Docker build used the documented optional trusted AVG
public CA mount; TLS verification was not disabled.

The first local expanded browser attempt passed three scenarios and failed on an
ambiguous alert locator (save error plus Next.js route announcer). Scoping to main
content fixed the assertion; the complete rerun passed. Successful requests still
use the real Express API and PostgreSQL. Only the error-path PATCH is intercepted.

## Hosted CI

- First run: [34236867782](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34236867782),
  exact fresh checkout of b2a1ffc, **failed** the browser contrast check; all prior
  lint/typecheck/format/migration/API/build/Compose/image/startup steps passed.
  Three browser scenarios passed, one failed (11.7 seconds).
- [First-run browser artifact](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34236867782/artifacts/10060374357)
  preserves the failure, report and actual captures.
- Corrected revision fe4c4d39b9cb42c46fd4f646f080cdb075274fe8:
  [run 34237500695](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34237500695)
  **completed successfully**. Logs confirm exact fresh checkout, frozen install,
  lint, typecheck, formatting, migration, 34 API tests, both builds, both Compose
  validations, image builds/startup and all four browser scenarios (20.9 seconds).
- [Successful browser evidence](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34237500695/artifacts/10060665834)
  contains the HTML/JSON reports, scroll attachments and fresh screenshots.
  Artifact ID 10060665834; SHA-256
  `a2cb7cb20eda179826942b568167369b76c8243a8e97d086df4afbd0e48441b7`.
  GitHub currently expires this artifact on 2026-12-07; committed screenshots remain.
- This report records the tested application revision. A subsequent docs/screenshots
  evidence commit does not change application or test source and is rechecked by CI.
  [PR Checks](https://github.com/EdenCirakoglu/Client-Tracker/pull/1/checks) and the PR
  description identify the latest tested evidence revision and its run.

CI uses a fresh Ubuntu runner, explicitly checks out
`github.event.pull_request.head.sha`, records `git rev-parse HEAD`, and installs
with the frozen lockfile. It retains isolated PostgreSQL migrations/tests and all
four real Compose browser scenarios with axe assertions. Reports record the
revision and dirty-tree flag. CI screenshots go to a fresh test-results directory,
not the repository's historical image folder.

## Browser Reproduction and Reports

API test output from `pnpm test` is not browser evidence. The separate command is:

```powershell
# From clientops-tracker/, with the isolated stack freshly seeded and healthy:
$env:VERIFY_URL='http://localhost:8180'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:BROWSER_CHANNEL='chrome'
pnpm.cmd test:e2e
```

[Exact first-run setup and requirements](BROWSER_TESTS.md) includes image builds,
migration, guarded reset and optional Playwright Chromium installation.
The four scenarios cover:

1. Real admin/developer/client workflow, client privacy, persisted advisory triage,
   comments, enum filters, empty states, scroll positions, mobile table access,
   dropdown saving/success/failure and refresh persistence.
2. Swagger through the same Nginx origin.
3. Mobile keyboard focus containment, Escape and focus restoration.
4. Invalid JWT recovery and cross-tab logout.

Local HTML: `playwright-report/index.html`; open with
`pnpm exec playwright show-report playwright-report`.
JSON: `test-results/browser-results.json`. Failure/scroll attachments:
`test-results/`. Public fictional captures: `docs/assets/screenshots/`.
Generated reports are intentionally ignored in Git. CI uploads both formats and
only that run's screenshots in `browser-evidence-<full-head-sha>`.

The local reports record a dirty tree because screenshots and evidence documents
were awaiting commit; application/test source matched their recorded revision.
This is distinguished from CI's fresh checkout. Axe scans at 1440px desktop and
390px mobile are focused coverage, not a full assistive-technology or device audit.

## Database and Container Evidence

Tests require explicit TEST_DATABASE_URL and DISPOSABLE_DATABASE_NAME and cannot
fall back to the development URL. Seeds require an exact disposable demo/test
designation, SEED_RESET=true, and non-production mode. The original database on
5432 was not reset. The local test cluster is clientops_test on 55433, separate
from the production-style clientops_verify_demo Compose volume.

On b2a1ffc, after the browser workflow, before and after all 34 API tests, and after restarting
all four containers, the complete read-only database fingerprint was identical:

```text
2023a5d23d021d70bc5752c7046a215bfee78da3bc94792507b7c46bdac78ee0
```

Counts: 2 clients, 4 users, 3 projects, 9 tickets, 7 comments, 12 events,
2 releases, 4 suggestions. No seeding occurred between those comparisons.

Actual runtime checks are separate from Compose config validation: API and web
images built, migrations ran as `node dist/migrate.js` inside the API image with
host `postgres`, Nginx served the browser and API, and all four services became
healthy. Only loopback Nginx port 8180 is exposed locally. Host-run migrations use
a host-accessible database address; the Compose hostname is not host-resolvable.

## Remaining Release Steps

- Keep PR #1 draft for human review. Merging and public deployment are a later,
  separately approved milestone.
- Image publication is not verified here. PR CI builds local runner images but
  does not push them; the main-only publishing workflow is a separate gate.
- No public deployment exists from this work. VPS, DNS, HTTPS, real production
  secrets, backups/restore verification and protected deployment environment remain.
- JWTs are stored in localStorage, persist across sessions and lack server-side
  logout revocation/refresh. Secure HTTP-only cookies and CSRF/session policy are
  production hardening, not completed work.
- Demo credentials are local-only. Secure production account provisioning remains
  to be implemented; never seed public production with password123.
- Resolution-cycle metrics, pagination, rate limiting, database-aware readiness
  and monitoring remain limitations. Current health is process liveness.
- Swagger's contract is public unless gated at the edge. Drizzle Studio and
  GitHub Actions UI screenshots are not fabricated from terminal output.
