# Release Readiness Evidence

## Repository Comparison

Verified on 2026-09-07 with `git rev-parse --show-toplevel`, `git status --short`,
`git log`, `git remote -v`, and a live `git ls-remote origin refs/heads/main`:

- Git root: `Client Tracker/`, one directory above the pnpm workspace.
- Remote: `EdenCirakoglu/Client-Tracker`.
- Local `main` and remote `main`: `611ca06184e33646ce521e511acf31afacf1cd98`.
- The newer frontend, Phase 6 documents and Phase 7 deployment configuration are
  local modified/untracked files. They are not in a later commit or another branch.
- Existing work and history are preserved. The handoff copy directory is excluded
  from Git; the original files in `clientops-tracker/` remain the source of truth.
- Workflows now live at the actual Git root, with workspace-relative working
  directories, dependency cache paths and Docker build contexts.

No commit or push has been performed by this pass. Hosted CI and public deployment
remain unverified until their own real runs succeed.

## Confirmed Defects and Changes

The supplied September screenshots were reviewed as historical evidence, not
assumed to represent the current database or a deployed application.

| Finding                                   | Reproduction and correction                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test records in demo                      | Original seed-using suite passed on an explicitly isolated database and left test-created rows there. Its former configuration could fall back to the development URL. Tests now require TEST_DATABASE_URL and an exact disposable database designation before importing the application. |
| Client developer workload                 | A new API regression test failed before the fix: the CLIENT response included developer names, emails and workload. Client dashboard responses now omit the key entirely and skip the developer query.                                                                                    |
| Internal triage in client create response | A regression test failed before the fix. Suggestions still persist on creation, but clients receive no internal suggestion or history.                                                                                                                                                    |
| Saved suggestion absent on reopen         | Detail-response regression failed before the fix. Internal ticket detail now loads the latest persisted suggestion, including accepted state.                                                                                                                                             |
| Cross-client direct access                | Existing ownership checks passed the new two-direction tests before changes. Retained and expanded coverage rather than claiming a newly fixed tenant breach.                                                                                                                             |
| Internal comments                         | Existing filtering passed the new regression before changes. Retained tests for normal comments and forbidden internal writes.                                                                                                                                                            |
| Repeated triage application               | Ticket-row locking and a transaction now cover updates, acceptance and history. Three concurrent applies produce one event; reapplying does not undo a later manual edit. This is verified coverage, not a claim of an observed production incident.                                      |
| Production migration packaging            | Actual image build exposed nested executable paths. Explicit tsup entries now emit dist/migrate.js; migration and guarded seed executed successfully inside the Compose network.                                                                                                          |
| Local build TLS                           | Container package downloads initially failed under Windows AVG TLS inspection. Optional BuildKit CA mount uses the existing trusted public root, not disabled certificate validation.                                                                                                     |
| CI discovery and configuration            | Workflows moved to the actual Git root. Cache/build paths point into the workspace. Container smoke steps clear inherited test database variables before loading the isolated environment.                                                                                                |

## Reviewable Change Groups

The [file-by-file inventory](CHANGE_INVENTORY.md) lists all working-tree paths
relative to public main, including preserved earlier uncommitted work.

- **GitHub entry points:** root README, LICENSE, contribution/security links,
  .github workflows and issue/PR templates, .gitignore and .gitattributes.
  Existing local Phase 6 community documents are preserved.
- **Database safety:** API env validation, db/safety.ts, db/seed.ts, db/migrate.ts,
  db/fingerprint.ts, Vitest setup, .env.test.example and docker-compose.test.yml.
  No schema tables or migrations were changed.
- **Backend privacy and triage:** dashboard.service.ts, ticket.service.ts,
  triage.service.ts, OpenAPI documentation and focused API regression tests.
- **Frontend:** existing local Phase 5 routes/components remain the application.
  API/auth utilities now handle session expiry; relationships use names; forms have
  linked labels; client navigation/actions and dashboard are scoped; triage loads
  from the API after refresh. Task-oriented copy replaces implementation commentary.
- **Delivery:** API/web Dockerfiles, production and optional build-CA Compose,
  .env.verify.example, .env.production.example, Nginx configuration, runtime
  migration/fingerprint entry points, root CI/image/manual deployment workflows.
- **Evidence:** Playwright browser journeys with axe checks, documentation,
  screenshot checklist and this report.

No staging, commit, push, history rewrite or cloud provisioning was performed.
The pre-existing ignored handoff copy is not the authoritative source tree.

## Database Isolation Evidence

The dedicated test cluster uses clientops_test on host loopback port 55433 and
tmpfs storage. The production-style local demo uses clientops_verify_demo in the
clientops-readiness Compose project and a separate persistent named volume.
The original clientops_tracker database on port 5432 was not reset or modified.

A read-only, repeatable-read fingerprint hashes all eight tables ordered by ID,
without printing their contents. Before and after the full API suite, the original
database had the same SHA-256:

```text
94fdf726f7b7cc6c35c1c19d7bd7d48ba1c6dc11b3235024287e11a6b121ddf7
```

Counts: clients 4, users 3, projects 4, tickets 16, comments 5, events 16,
releases 2, suggestions 12. This confirms preservation, not cleanliness of the old
demo. The fresh isolated demo is used for new screenshots.

Seed resets require an exact disposable name ending in demo or test, plus
SEED_RESET=true, and reject production mode. Fictional demo data includes two
organisations, four users, three projects, eight tickets, public/internal comments,
events, releases and pending suggestions. Dates are relative to seeding, with
resolved dates after ticket creation. Passwords are bcrypt hashes; published demo
credentials are local-only.

## Local Checks

Executed on Windows with Docker Desktop; use pnpm.cmd when PowerShell blocks .ps1 wrappers.

| Check                                                          | Result                                                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Live git ls-remote and local comparison                        | Same main SHA noted above                                                               |
| pnpm install --frozen-lockfile                                 | Passed                                                                                  |
| pnpm lint                                                      | Passed                                                                                  |
| pnpm typecheck                                                 | Passed, including browser-test TypeScript                                               |
| pnpm test, explicit isolated configuration                     | 33 tests passed across four files                                                       |
| pnpm test, no test configuration                               | Refused before database access, as intended                                             |
| pnpm build                                                     | API and Next.js production builds passed                                                |
| docker compose config --quiet                                  | Passed; configuration validation only                                                   |
| Production Compose with .env.production.example config --quiet | Passed; configuration validation only                                                   |
| Local API/web Docker builds                                    | Passed; image tags local-verify, not published                                          |
| In-image migrate and guarded seed                              | Passed in isolated Compose network                                                      |
| Browser scenarios with axe checks                              | Four passed using fresh-profile Chrome against Nginx                                    |
| Restart and API readback                                       | Passed, identical complete database fingerprint; ticket state/history/comments retained |

The earlier report of a sandbox build problem is not treated as a TypeScript
failure: both current host production builds and Linux container compilation
completed successfully.

Final pnpm lint, typecheck, build and format:check all passed. Markdown file links
resolve, git diff --check passes, and tracked environment-related files contain
examples/configuration only, not real env files. Both running application containers
report UID 1000. Mermaid source was reviewed for relationship consistency, but no
separate Mermaid rendering/parser verification was performed in this session.

A final live git ls-remote still returned the same main SHA. No GitHub Actions run
has been created or asserted by these local checks.

## Container Runtime Evidence

The final images were built locally, not pulled from or published to GHCR.
All four services are healthy in the clientops-readiness project. Only Nginx is
published, at 127.0.0.1:8180; PostgreSQL, API and Next.js ports remain private.

Commands executed successfully, using the dc helper in DEPLOYMENT.md:

```powershell
dc build
dc up -d --wait postgres
dc run --rm --no-deps api node dist/migrate.js
dc run --rm --no-deps -e NODE_ENV=development -e DISPOSABLE_DATABASE_NAME=clientops_verify_demo -e SEED_RESET=true api node dist/seed.js
dc up -d --no-build --wait
dc up -d --no-deps --force-recreate --wait nginx
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:BROWSER_CHANNEL='chrome'
pnpm test:e2e
dc run --rm --no-deps api node dist/fingerprint.js
dc restart
dc up -d --no-build --wait
dc run --rm --no-deps api node dist/fingerprint.js
```

On this TLS-inspected Windows machine the image build used the documented optional
build-CA override. Compilation, migration, seed and runtime succeeded. pnpm deploy
emitted warnings about omitted development-tool bin links; no runtime executable
depended on those tools. The in-image migration command uses the Drizzle runtime.

The fresh demo was also fingerprinted before and after the 33-test API suite:
7735fcf517f70c69ac8017878a1fabc96ae33d53e6195a9bd529466ead513140,
with 2 clients, 4 users, 3 projects, 8 tickets, 5 comments, 6 events, 2 releases and
3 suggestions. It was unchanged by tests.

After the browser workflow, the fingerprint before and after restarting all four
containers was:

```text
866b6087e241591e13faadbeb736f4cc511de01589840c3165867a4b91aa21c7
```

Counts: 2 clients, 4 users, 3 projects, 9 tickets, 7 comments, 11 events,
2 releases and 4 suggestions. A fresh login and Nginx API readback confirmed the
new ticket remained IN_PROGRESS/PERFORMANCE with an accepted suggestion, one apply
event and two comments. No seeding occurred between those two fingerprints.

## Browser Journey Results

Four Playwright scenarios passed in 57.7 seconds against the real local containers:

1. Manual failed login followed by demo login; admin tables, search/enum filters and
   empty results; ticket creation; pending saved triage after reload without
   overwriting input; apply and reload; repeated API apply with one event;
   internal comment; developer read-only clients and ticket status update;
   client-scoped dashboard/projects/releases/project options; denied client
   directory; public comment without internal note/triage/status controls;
   mobile navigation, tables and dashboard.
2. Swagger loads through the same Nginx origin.
3. Mobile menu receives and contains keyboard focus, closes with Escape and
   returns focus to its opener.
4. Invalid token redirects to login and clears storage; logout propagates to a
   second tab.

Axe WCAG 2 A/AA and 2.1 AA scans reported no violations on the checked application
screens. Root-page overflow checks passed at desktop 1440px and mobile 390px.
This is not a full accessibility certification or a multi-browser device matrix.
The complete journey recorded no page JavaScript errors.

## Product Design Evidence

Reference: the user's supplied screenshots of login, administrator/developer/client
dashboards, lists and releases. No ClientOps Figma file or saved design reference
was available in this session. The existing teal/white/navy application is retained.

Historical screenshots show implementation-oriented copy, test-record names,
workload visible to clients, narrow table cells and a release-permission explanation
occupying a full panel. Those observations informed scoped copy/layout/data fixes.
They are distinct from the new runtime captures listed in SCREENSHOTS.md.

New captures were inspected directly: administrator/client/developer dashboards,
login, clients, projects, releases, tickets list, pending/applied triage,
client ticket and mobile tickets/navigation. The [screenshot index](SCREENSHOTS.md)
links all 18 captures, including additional client-only and mobile views.

Two new browser findings were reproduced and fixed: dashboard muted text missed
contrast requirements, and keyboard focus escaped the mobile drawer. The muted
colour is darker; the drawer now manages focus, Escape, return focus and background
interaction. A display-label change made during this pass initially altered select
values; the real creation flow caught it. API enum values are restored while labels
remain readable, with filter/creation coverage in the passing final suite.

Observed final screens retain the existing navigation and restrained styling,
show names instead of relationship IDs, keep forms associated with visible labels,
and omit the former API-permissions explanation panel for read-only releases.
The mobile table deliberately scrolls inside its own bounded region rather than
forcing the page wider. Pending and applied triage screenshots visibly distinguish
the advisory proposal from the accepted ticket state.

Automated axe checks and keyboard/viewport assertions support, but do not replace,
manual accessibility testing with assistive technology.

## Remaining Release Gates

- **GitHub:** review and commit the complete working tree, including previously
  untracked frontend/docs. Push a review branch, open a PR and wait for an actual
  root CI run. Hosted CI is pending, not inferred from local checks.
- **Registry:** wait for both images for the reviewed full SHA after successful
  main CI. Local tags do not prove GHCR publication.
- **Public deployment:** separate step; provision VPS, DNS, HTTPS, real secrets,
  backups/restore checks and environment approval/SSH fingerprint configuration.
- **Accounts and sessions:** production account provisioning with unique passwords
  remains to be implemented. Never seed public production with password123.
  JWTs remain in localStorage, persist across browser sessions, expire after the
  configured lifetime and have no server-side logout revocation or refresh flow.
  Secure HTTP-only cookies and CSRF/session policy are a production-hardening gate.
- **Other hardening:** request throttling, pagination, monitoring and database-aware
  readiness probes remain future work. Current health endpoints are process
  liveness only. Swagger's contract is public unless gated at the public edge.
- **Visual evidence:** Drizzle Studio and a real passing GitHub Actions screenshot
  are separate captures; do not manufacture or relabel them from local output.

## Review and Publish

From the Git root, inspect all local changes before staging. No force push is needed.

```powershell
git status --short
git diff --stat
git diff --check
git switch -c release/readiness-review
git add .github .gitattributes .gitignore README.md LICENSE CONTRIBUTING.md SECURITY.md clientops-tracker
git diff --cached --stat
git diff --cached
# After reviewing the full staged diff, commit and push the new branch.
git commit -m "Prepare ClientOps Tracker for review and isolated delivery"
git push -u origin release/readiness-review
```

The staging command deliberately excludes the sibling handoff bundle and ignored
local artifacts. Verify the staged list contains no real environment files,
database dumps, tokens, keys or browser profiles before committing.
