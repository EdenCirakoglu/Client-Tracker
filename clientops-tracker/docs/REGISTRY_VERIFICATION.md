# Published Image Verification

Recorded 2026-09-09. This is local verification of images downloaded from GHCR,
not a public/server deployment. No DigitalOcean workflow was triggered.

## Revision and Hosted Evidence

- [Merged PR #1](https://github.com/EdenCirakoglu/Client-Tracker/pull/1).
- Main: `3fa8d7f51a3dc9bfc9225697085131d75d9ec197`.
- Normal merge parents: `611ca06184e33646ce521e511acf31afacf1cd98` and
  `e1bedcdcd13107f1d6dfe6ee79f1fa5af4d2a51b`. No squash, rebase or force push.
- [Final PR CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34366664478)
  tested `e1bedcd`: 37 API tests and four browser scenarios (19.5 seconds), plus
  lint, typecheck, formatting, migrations, builds and Compose runtime, all passed.
- [Main CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34367236859)
  checked out the exact main SHA above: all the same checks passed, including
  37 API tests and four browser scenarios (19.1 seconds).
- [Docker Images](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34367701514)
  was triggered automatically by successful main CI, not manually. Both jobs
  validated CI for `SOURCE_SHA` and built/published that exact revision.
  API job: `102520590664`; web job: `102520590365`; both successful.

Browser evidence is revision-specific:

| Revision           | Hosted browser artifact                                                                                       | Artifact SHA-256                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Prior PR `9625fe8` | [10060916771](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34238183699/artifacts/10060916771) | `5b8f9fe5b78a9bf1a40eb91b3e7fc641432501654e26631ee3cadc9f2a696d71` |
| Final PR `e1bedcd` | [10110303302](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34366664478/artifacts/10110303302) | `ece17e81bbb692ccf33077e37e13f7b493835ca510cc2e03ee800fe36bb1f387` |
| Main `3fa8d7f`     | [10110525851](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34367236859/artifacts/10110525851) | `27a063a1b4bfb8a5179a89d4c4335425bb7b6be0f85842211d7d92dabf8955f0` |

The final PR/main artifacts currently expire 2026-12-08. CI runtime tests build
runner-local images; the separate local test below verifies the **published** ones.

## Published Images

Both use the full main SHA tag, run as non-root `node`, and were verified locally
on Linux/amd64. ARM64 was not tested or published by this workflow.

```text
ghcr.io/edencirakoglu/client-tracker-api:3fa8d7f51a3dc9bfc9225697085131d75d9ec197
ghcr.io/edencirakoglu/client-tracker-web:3fa8d7f51a3dc9bfc9225697085131d75d9ec197
```

Published manifest digests, independently matched against local `RepoDigests`:

```text
API: sha256:0e500d2bde8d2dc055d106befede3b1edb78becfd211cf6d46bbbc088487be6d
Web: sha256:df09ff57bab80318c873b8421b8d9574a2d98b5b7e5c275f609799b0e447df1c
```

Each image's `org.opencontainers.image.revision` label equals the main SHA.
Use `ghcr.io/edencirakoglu/client-tracker-api@sha256:...` (or `-web@sha256:...`)
with the complete digest above for an immutable image reference. SHA-named tags
are convenient, but registry tags themselves are mutable.

## Local Runtime Results

Docker Desktop with Engine 29.7.2, Linux containers, Node.js 24, pnpm 9.15.4, installed Chrome
with a fresh isolated Playwright profile. Test checkout was clean at the main SHA.

| Check                       | Result                                                                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Production Compose config   | Passed separately from runtime checks                                                                                                                 |
| `compose pull api web`      | Both main-SHA images downloaded successfully; no local rebuild                                                                                        |
| In-image migrations         | `node dist/migrate.js` passed against Compose host `postgres`                                                                                         |
| Fictional demo seed         | Passed only in the explicitly designated disposable database                                                                                          |
| Startup and routing         | PostgreSQL, API, web and Nginx healthy; only `127.0.0.1:8181` exposed                                                                                 |
| Four browser/axe scenarios  | 4 passed, 0 failed/skipped/flaky, 23.3 seconds                                                                                                        |
| Workflow                    | Admin/developer/client login, ticket creation, comments, category/priority/status changes, saved/applied triage, client privacy and Swagger passed    |
| Persistence                 | All four containers/network removed and recreated without deleting the volume; entire database fingerprint unchanged                                  |
| Post-recreation HTTP checks | Login, ticket detail, two staff-visible comments, one client-visible public comment, accepted triage and single application/category events persisted |

The browser report records `revision=3fa8d7f51a3dc9bfc9225697085131d75d9ec197`,
`workingTreeDirty=false`, `target=http://localhost:8181`, `browser=chrome`.
Start: `2026-09-09T15:07:29.698Z`; duration: `23336.306ms`.

Local report paths, relative to the workspace:

- HTML: `playwright-report/index.html`.
- JSON: `test-results/browser-results.json`; SHA-256
  `7f5efb79aea6abee3e63deae4b46de0014e3da5142446b9d39a9786ed206b309`.
- Fresh captures: `test-results/registry-screenshots/` (21 images).
  Applied triage and client dashboard captures were visually inspected.

Generated local reports remain ignored, not checked into Git. Later browser runs
replace them. Hosted artifacts above are downloadable but are **CI-build** evidence,
not a claim that GitHub ran the local GHCR-pull test. No personal browser profile,
session trace, live password or token is included in this evidence document.

## Commands Used

Run in `clientops-tracker/`. The ignored `.env.registry` contained these **local
disposable values only**, not production secrets:

```dotenv
GHCR_OWNER=edencirakoglu
GHCR_REPOSITORY=client-tracker
IMAGE_TAG=3fa8d7f51a3dc9bfc9225697085131d75d9ec197
HTTP_BIND=127.0.0.1
HTTP_PORT=8181
POSTGRES_USER=clientops_registry
POSTGRES_PASSWORD=local_registry_disposable_password
POSTGRES_DB=clientops_registry_3fa8d7f51a3d_demo
DATABASE_URL=postgresql://clientops_registry:local_registry_disposable_password@postgres:5432/clientops_registry_3fa8d7f51a3d_demo
JWT_SECRET=registry_local_disposable_jwt_secret_not_for_public_use
CORS_ORIGIN=http://localhost:8181
NEXT_PUBLIC_API_URL=/
```

Use a fresh PowerShell session without inherited Compose variables, or remove those
listed above first. The verification helper explicitly removed inherited values so
they could not override this file. The commands executed were equivalent to:

```powershell
function dc { docker compose -p clientops-registry-3fa8d7f51a3d --env-file .env.registry -f docker-compose.prod.yml @args }
dc config --quiet
dc up -d --no-build --wait postgres
dc pull api web
dc run --rm --no-deps --pull never api node dist/migrate.js
dc run --rm --no-deps --pull never -e NODE_ENV=development -e DISPOSABLE_DATABASE_NAME=clientops_registry_3fa8d7f51a3d_demo -e SEED_RESET=true api node dist/seed.js
dc up -d --no-build --pull never --wait
dc ps

$env:VERIFY_URL='http://localhost:8181'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:BROWSER_CHANNEL='chrome'
$env:E2E_SCREENSHOT_DIR='test-results/registry-screenshots'
pnpm.cmd test:e2e

dc exec -T api node dist/fingerprint.js
dc down
dc up -d --no-build --pull never --wait
dc exec -T api node dist/fingerprint.js
```

Check each command's exit code before continuing. Never add `--build`, `down -v`
or seeding to a production update. Seeding resets this disposable demo; skip it
when checking persistence. `postgres` is the container-network database address,
not a host-resolvable database address. See [browser requirements](BROWSER_TESTS.md).

After recreation, separate authenticated HTTP reads confirmed the browser-created
ticket `1894bc70-f4d9-47bc-9349-83cdb2ed706a` retained `IN_PROGRESS`, `HIGH`, `BUG`,
two comments, accepted triage, one `TRIAGE_SUGGESTION_APPLIED` and one
`CATEGORY_CHANGED` event. The client saw only its public comment, no internal
triage/history and no developer workload. `/login`, `/api/health` and `/api/docs/`
returned HTTP 200. Successful browser mutations used the real API; only the
documented save-error scenario deliberately injected HTTP 503.

## Persistence and Database Preservation

New volume: `clientops-registry-3fa8d7f51a3d_postgres_data`.
Before and after complete container recreation, without reseeding:

```text
febb59bd367bfee2140a92b40d974543fe1c3b4547a3b965210753d8ac1323c6
```

Counts: 2 clients, 4 users, 3 projects, 9 tickets, 7 comments, 13 events,
2 releases, 4 suggestions. The recreated stack remains available locally at
http://localhost:8181/login. `dc down` can stop it while retaining the volume.

Existing readiness volume `clientops-readiness_postgres_data` retained its original
SHA-256 `cd24ac65b85043d89f0a99581e398423989be2bb9be585dc7a2af4514f644c74`
and counts (2 clients, 4 users, 3 projects, 9 tickets, 7 comments, 12 events,
2 releases, 4 suggestions). Its port remains 8180.

Original development volume `clientops-tracker_postgres_data`, database
`clientops_tracker`, was not reset. Read-only ordered row-content hashes and
counts matched before and after (MD5 here detects changes, not a security guarantee):

| Table              | Count | Before and after MD5               |
| ------------------ | ----- | ---------------------------------- |
| clients            | 4     | `fb071cba096be1bee9533b7ed158132c` |
| users              | 3     | `ccc72d157792ccfe90e3b700aa6259c7` |
| projects           | 4     | `e164002775c071ee23b0425fd5dce1c5` |
| tickets            | 16    | `1b98483d03b6b3d3e9b87cca2aa84be9` |
| ticket_comments    | 5     | `030b25c9f8bb159c796c8b08d39ac25a` |
| ticket_events      | 16    | `48d0d11a55ca27c98807e0151a7c12c6` |
| releases           | 2     | `16e2d039c2f50de7e62e89d19803e0b4` |
| triage_suggestions | 12    | `c1f3ca7d225be43f5a9807889b3c0fe2` |

## Next Focused Hardening Phase

1. Replace localStorage JWT sessions with secure HTTP-only cookies, explicit
   SameSite/CSRF policy, expiry/rotation and server-side revocation. Cover logout,
   password changes, session expiry and tenant boundaries with tests.
2. Add secure non-demo account provisioning: one-time administrator bootstrap,
   admin-controlled invitations with expiring single-use tokens, password setup
   and recovery. Keep role/client assignment server-controlled. Disable demo login
   actions for a public production build; never run demo seeding there.
3. Complete public-launch gates: domain/TLS, protected deployment approvals,
   real secrets and rotation, rate limiting, database-aware readiness, backups with
   a tested restore, monitoring/log redaction, restricted database ports and an
   explicit Swagger exposure policy. Review dependencies and image vulnerabilities.

Pagination and accurate reopened-ticket resolution-cycle metrics remain known
limitations. Triage is advisory rules with a heuristic score, not a validated
probability or live LLM. Public deployment requires a separate authorization step.
