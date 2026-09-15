# PR #5 Release Candidate Handoff

This is the follow-up to checked revision `10241678b095578f44c9e399887d66b7ebb0a13d`
and its [passing CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34860356599).
That evidence remains historical. New deployment-sequence and certificate-hook
evidence must identify the newly tested PR head. PR #5 remains unmerged; no paid
resource, public deployment, real-recipient email or manual image publication occurs
in this phase.

## Reviewed Candidate and Reproduction

Operational implementation: `92a9b8e785db1784941bca55bcdb57a4dfd9110c`.
The evidence-only commit following it does not relabel its reports. The final PR
head and its own CI result are recorded in [PR #5](https://github.com/EdenCirakoglu/Client-Tracker/pull/5).

The preceding [CI at `74615def`](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34871656821)
**failed**, despite passing its browser, native-zoom, API and other preceding gates.
Rollback waited for Nginx health while its upstream API was stopped. The fix starts
the private API/web first, then starts the already-gated proxy. No probe or test was
removed. The clean local deployment rehearsal at `74615def` remains separate evidence
for that revision, not a passing hosted run.

The renewed local outage check initially exceeded Node's default output buffer by
reading all accumulated preview logs; it was not a detected credential leak. The
check now scans the entire test interval, including the temporary worker, with a
bounded buffer and redacted phase diagnostics. A final verification-only follow-up
also includes both stdout and stderr. Two restore attempts could not create
a network because Docker's default address pool was exhausted. Only two confirmed
empty diagnostic networks were removed; no container or database volume was removed.
The succeeding populated restore retained all eight business tables, rejected old
sessions/links and passed the pinned rollback. Its report records `74615def` plus
uncommitted fixes; do not mislabel it as a clean-head run.

At clean `92a9b8e`, these local commands completed successfully:

- `pnpm typecheck`, `pnpm test` (75 API tests, nine files), `pnpm build` (API and web).
- `node scripts/verify-deployment.mjs --followup`: installation, populated `7eba339`
  restricted-role conversion, verified encrypted backup, deliberately failing SQL
  migration, startup failure, reviewed repair-forward, later update, login/comments
  and cross-organisation denial. Source records were unchanged; application images
  were not rebuilt by the rehearsal.
- The deployment fixture tested private-CA HTTPS, production-mode private routing,
  hostname mismatch rejection, actual served certificate changes, wrong-key rejection,
  failed Nginx validation/restoration and five captured failure alerts. Public CA,
  real SMTP, S3 and real operator delivery were not exercised.

Immediately before that commit, lint, formatting, all 21 helper regressions, the
redacted secret/history scan, DB/SMTP outage/retry, encrypted backup/failure detection
and populated restore/rollback also passed with these fixes. Hosted CI provides the
fresh-checkout, exact-head verification rather than treating a dirty local report as
clean evidence. Reports and exact repeat commands are below.

The [fresh CI for `92a9b8e`](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34972131669)
passed 75 API tests, 21 helper tests, builds, ten browser scenarios (82.22s,
zero failed/skipped/flaky), native 200% zoom, restricted roles, outages, backups,
schedules and populated restore/rollback. It **failed** during the final certificate
fixture, so it is not a successful overall CI result. Linux reproduced the problem:
the capabilities-dropped operator cannot open a runner-owned mode-700 certificate
directory. The fixture now exposes only public certificates across UIDs; keys stay
mode 600. The hook preserves readable public-chain permissions after renewal and
restore, and Linux CI checks that the runner-owned private key cannot be opened by
the restricted operator. Production certificate directories remain root-owned/private.

The [artifact](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34972131669/artifacts/10398681499)
was downloaded and its ZIP SHA-256 independently matched
`c558d19f2e8dabe18bdefa59101e22c5b11d762311fd60bb157d6897aeb5cf11`.
[Nine inspected captures](SCREENSHOTS.md#release-candidate-acceptance-2026-09-15)
record account states, invitation delivery, comment audience, mobile filters and
native zoom. The archive excludes keys and dumps. Its explicit `metadata.revision`
and recorded Git HEAD identify the actual checkout; Playwright's additional CI
metadata may identify GitHub's synthetic PR merge ref instead.

The final stdout/stderr and Linux-permission corrections follow this evidence.
**Do not approve merge until the latest PR head's complete CI passes.** Its exact
head, final run and artifact links are maintained in the PR handoff rather than
assigning these earlier screenshots/results to a later revision. Screen-reader
and real-environment acceptance remain independent launch gates.

## Review Findings and Changes

- Confirmed: the old SSH workflow migrated before stopping API/worker writers and
  did not enforce a verified backup or restricted-role conversion. Workflow and
  runbook now call `scripts/deploy.mjs` for one bounded sequence.
- Provisioning is explicit (`install`/`convert` plus exact database confirmation),
  separate from API credentials. Workflow automation allows only `update` after
  successful installation/conversion. Unknown writers, missing backups/roles and
  wrong image provenance fail before migration.
- Failed migration/startup leaves maintenance blocked, attempts to stop all writers,
  alerts and requires a reviewed retry. No migration reversal or automatic image
  fallback is assumed. Rollback now requires an explicit applied-schema review.
- Scheduled writers share the deployment lock and pinned successful configuration.
  Operator image source is labelled with the same SHA; its local ID is recorded
  privately in prepared Compose. Application images are pulled by registry digest,
  not rebuilt. Nginx configuration is frozen beside the release configuration.
- Certificate renewal now validates key correspondence/expiry, retains the previous
  pair through Nginx validation/reload, records success/failure and attempts an alert.
  Its shared lock prevents simultaneous deployment/certificate mutation.
- Application design and account/ticket features are unchanged. Account outcomes,
  visibility/error associations, retained note audience and mobile URL filters are
  checked through the existing browser scenarios, not inferred from old screenshots.

## Local Commands and Evidence

From the workspace, with Node24, pnpm9, Docker Linux containers and OpenSSL (Git's
bundled OpenSSL is the Windows default; `OPENSSL_BIN` can override the renewal tool):

```powershell
node scripts/hardening-stack.mjs start --followup
$env:BROWSER_CHANNEL='chrome'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8456'
$env:ACCOUNT_SETUP_URL='https://localhost:8457'
$env:ACCOUNT_MAIL_URL='http://localhost:8037'
$env:E2E_SCREENSHOT_DIR='test-results/release-candidate/screenshots'
pnpm test:e2e
$env:VERIFY_PROJECT='clientops-followup'
$env:UI_EVIDENCE_DIR='test-results/release-candidate/ui-acceptance'
node scripts/verify-ui-acceptance.mjs
node scripts/verify-deployment.mjs --followup
pnpm test:verification
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
```

`verify-deployment.mjs` creates a uniquely named `clientops-deploy-*` stack and volume,
checks first installation, copies fictional business records without modifying the
source, runs published `7eba339` under owner credentials, removes only the new fixture's
roles and converts it. It exercises a real failing SQL migration and an invalid-secret
startup, blocked automatic retry and explicit repair-forward. It also verifies
subsequent updates, login/comments/tenant denial and certificate reload/failures.
The fixture is stopped but retained afterward. Reports:
`test-results/deployment-runtime.json`, `test-results/browser-results.json`,
`playwright-report/index.html`, and `UI_EVIDENCE_DIR/acceptance.json`. Private
configurations, keys and copied data remain under ignored/excluded `test-results/tls/`.

Run the unchanged isolated API, outage, backup and restore suites using the exact
environment in [FOLLOWUP_READINESS.md](FOLLOWUP_READINESS.md#exact-local-preview).
The root CI retains those gates and adds deployment/certificate recovery. Hosted
results for the final reviewed head are linked in [PR #5](https://github.com/EdenCirakoglu/Client-Tracker/pull/5),
not retroactively assigned to the earlier `1024167` artifact.

## Screen-Reader Manual Acceptance

**Outstanding.** Windows Narrator is installed, but this agent session has no
screen-reader audio/control interface. Keyboard/axe/native-zoom tests are not a
screen-reader walkthrough. A human should record OS, browser, screen-reader version,
revision, viewport and announced results for each step below. Use isolated local
fictional accounts; do not record spoken passwords or link tokens.

1. Open <https://localhost:8457/login> in a fresh Chrome profile. Start Narrator with
   `Win+Ctrl+Enter` (or NVDA). Navigate headings/landmarks and Tab through Email,
   Password, visibility, Sign in and recovery. Each control must announce its name,
   role and current state; demo shortcuts must be absent in this non-demo fixture.
2. Submit an invalid login and listen for the error. On My account, submit mismatched
   new passwords. Confirm the outcome heading and relevant field error are announced
   without losing keyboard context. Toggle visibility with Space: Show/Hide password
   and pressed state must change without speaking the secret value automatically.
3. Use the account Cancel action, desktop collapsed navigation and mobile drawer.
   Check current-page indication, meaningful collapsed labels, contained focus,
   Escape and focus restoration. No header should cover the focused control at 200%.
4. In the disposable demo at <https://localhost:8456>, open Tickets at 390x640.
   Focus Filters and press Enter. Confirm expanded/collapsed state is announced;
   controls become reachable, active filters and Reset remain understandable, and
   browser Back restores the previous filter. Reach the first ticket without scrolling
   through hidden filter controls.
5. As an internal user, open a ticket and reach comment audience. Arrow/Space between
   Reply to client and Internal note must announce selection and matching submit action.
   Submit a fictional internal note and confirm the delivery status is announced and
   Internal note remains selected. As a client, only the public reply action is available.
6. Use the capture mailbox at <http://localhost:8037> for invitation/recovery. Confirm
   Check your inbox remains generic, Password updated offers Sign in, and a used link
   announces Link unavailable. Record pass/fail and reproduction steps; do not claim
   completion until a person has actually listened through the journey.

## Post-Merge Published-Image Verification

These are **prepared commands**, not claims that this unmerged candidate is published.
Use an isolated verification machine or an existing read-only published baseline;
do not replace an existing fixture's private configuration or reuse development DBs.
GitHub CLI requires repository/actions read access; private GHCR packages additionally
need read-packages access. Do not put access tokens in commands or artifacts.

```bash
# At the Git root, after the user's normal merge.
git fetch origin main
MAIN_SHA=$(git rev-parse origin/main)
gh run list --repo EdenCirakoglu/Client-Tracker --workflow ci.yml --branch main --commit "$MAIN_SHA" --event push --json databaseId,headSha,status,conclusion,url
# Select the exact successful main run and publishing run; inspect SOURCE_SHA in publication logs.
gh run view MAIN_CI_RUN_ID --repo EdenCirakoglu/Client-Tracker --exit-status
gh run list --repo EdenCirakoglu/Client-Tracker --workflow docker.yml --branch main --json databaseId,headSha,status,conclusion,url
gh run view IMAGE_RUN_ID --repo EdenCirakoglu/Client-Tracker --json jobs,conclusion,url
docker pull "ghcr.io/edencirakoglu/client-tracker-api:$MAIN_SHA"
docker pull "ghcr.io/edencirakoglu/client-tracker-web:$MAIN_SHA"
docker image inspect "ghcr.io/edencirakoglu/client-tracker-api:$MAIN_SHA" --format '{{index .Config.Labels "org.opencontainers.image.revision"}} {{json .RepoDigests}}'
docker image inspect "ghcr.io/edencirakoglu/client-tracker-web:$MAIN_SHA" --format '{{index .Config.Labels "org.opencontainers.image.revision"}} {{json .RepoDigests}}'
```

Require completed/success for main CI and **both** publishing jobs, with source and
both OCI labels equal to `MAIN_SHA`. Record their URLs and registry digests. Publication
does not prove runtime correctness. On a fresh verification host, retaining the
verified `MAIN_SHA` in the shell, use a new checkout:

```bash
git clone https://github.com/EdenCirakoglu/Client-Tracker.git clientops-post-merge
cd clientops-post-merge
git checkout --detach "$MAIN_SHA"
cd clientops-tracker
pnpm install --frozen-lockfile
# Only when no baseline exists on this verification host; otherwise use its preserved config.
node scripts/verify-published.mjs start --release=7eba339
# Uses only the baseline as a read-only data source. Pulls target images, never builds them.
node scripts/verify-deployment.mjs --published=7eba339 --target-revision="$MAIN_SHA"
```

On this existing development machine, do not initialise a second copy of an
already-named published baseline. Use its preserved checkout/private configuration
or a separate verification host instead. Never remove its volume to free a name.

The new rehearsal builds **only the operator image** from that clean source revision,
labels it and pins its ID in the private configuration. Keep the source SHA, operator
Dockerfile/base/dependency versions and `docker image inspect` output in the private
release inventory. A rebuild of the same source can resolve newer base packages;
it is not promised to be bit-for-bit reproducible. Preserve the tested operator image
with an approved private image archive/registry for recovery; do not publish it manually
as part of this task. Application digest references and operator ID can be inspected
from the generated private config without printing its environment section.

Run the resulting preserved stack for browser acceptance using the project/origin in
`deployment-runtime.json` and its `test-results/tls/<project>/state/current.json`.
Use `docker compose -p <project> -f <private-config> up -d --no-build --wait api web nginx`.
Repeat account, comment, tenant, readiness and persistence checks; keep all keys/data
private. Production installation/conversion uses the exact same prepare/apply sequence
in [OPERATOR_CONTROLS.md](OPERATOR_CONTROLS.md#first-setup-and-updates), with production
TLS/SMTP/backup configuration rather than the fixture bypass.

## Merge and Launch Gates

Merge readiness requires current-head CI and review of the failure/recovery policy;
it is distinct from launch approval. [Real-environment acceptance](OPERATOR_CONTROLS.md#real-environment-acceptance)
lists exact domain/host/secrets/SMTP/storage/escrow/monitor/logging inputs and the
required real-recipient email, certificate deploy hook, separate-host restore,
operator alert, stopped-host/missing-heartbeat, RTO/RPO and named-owner evidence.
Those external-service checks and the screen-reader walkthrough remain outstanding.
