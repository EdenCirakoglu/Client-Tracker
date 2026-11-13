# Meridian Portal Review

## Candidate and Boundary

Branch: `feature/meridian-portal`, based on PR #37 at
`6b07dee441281b959cbc2cb64fd4e5fdc89fcc56`, with the PR #36 CI-only follow-up
merged at `ae6d93ee8b52967a2e461676392c425fb4c1336c` (`ae6d93e`). This is a
review candidate, not a merge, release or public deployment.
[Draft PR #43](https://github.com/EdenCirakoglu/Client-Tracker/pull/43)
targets `feature/meridian-ticket-review`;
[complete incremental diff](https://github.com/EdenCirakoglu/Client-Tracker/pull/43/files).
Retarget and revalidate against main only after independently approved parents land.

This increment extends Meridian hierarchy across the portal and adds the personal
workflow queue contract. No migrations or schema changes are introduced; existing
authentication, organisation boundaries and client decision authority remain.
Ticket status, scope agreement, delivered release and client acceptance stay
separate facts. There are no invented SLA, readiness approval or completion claims.

The route-by-route inventory, including retained and excluded surfaces, is in
[MERIDIAN_PORTAL_ROUTES](MERIDIAN_PORTAL_ROUTES.md). That report describes the
whole portal's route coverage. The original ticket-review implementation and evidence
remain in [MERIDIAN_REVIEW](MERIDIAN_REVIEW.md), [Design QA](../design-qa.md) and
[the #37 screenshot manifest](assets/screenshots/meridian/README.md). Do not replace
those captures or reinterpret their results as portal-wide verification.

## Role Hierarchy

- **Client:** Your delivery journal leads with Your next decision, the actual
  revision, named reviewer and review destination. Organisation requests are
  separate from personal decisions. With no personal decisions, Request a change
  and View active organisation requests remain available.
- **Developer:** Your work leads with Your next actions: Ready for me, Changes
  requested and Waiting for client. Counts and rows are server-filtered to the
  signed-in assignee. Recorded action reasons name reviewers where available;
  team delivery follow-up and explicitly team-wide metrics remain secondary.
- **Admin:** Client setup selects an authorised client immediately and shows a
  factual next step linked to the existing guide/forms. A remembered client ID is
  account-scoped and checked against the current authorised list. Commitments and
  follow-ups precede Request follow-up; installation-wide setup is distinct from
  one client's setup. An active reviewer alone is not completed onboarding.

Metrics, workload and activity support the primary work instead of gating it.
Each data section retains loading, error and retry states. Five zero category
counts do not imply an empty follow-up queue: only the full follow-up total does.
A genuinely empty admin follow-up offers Record a request and View projects.
Failures never become zero counts or an all-clear message.

## Workflow Contract

See [DASHBOARD_QUERIES](DASHBOARD_QUERIES.md) for fields, permissions and filters.
`workflow=ready|changes|waiting` requires `assignment=mine` and is staff-only.
The latest scope and delivery revisions are selected independently. Classification
happens before counting and pagination, in this order:

1. **Changes:** either latest revision has `CHANGES_REQUESTED`.
2. **Waiting:** otherwise, scope is `PROPOSED`, delivery is `PROPOSED` or
   `AWAITING_ACCEPTANCE`, or ticket status is `WAITING_FOR_CLIENT`.
3. **Ready:** otherwise, the ticket is unresolved. This does not assert approved
   scope; missing or rejected scope is not approval.

Resolved and closed tickets can still appear in changes or waiting. Do not add
`status=UNRESOLVED` to a complete workflow-lane query: it would hide pending reviews
on those tickets. Counts and rows share a repeatable-read snapshot per request;
separate lane requests are not one combined snapshot. Navigation uses the API's
`workflowHref`, `nextAction` and `actionReason`, not inferred approval authority.

## Private Preview

Open <http://localhost:3082/dashboard>. At `/login`, use Continue as Admin,
Continue as Developer or Continue as Client. Use Logout before selecting another
role. These are fictional demo accounts; do not submit decisions on the retained
capture fixture during a read-only review.

| Service      | Isolated preview endpoint                          |
| ------------ | -------------------------------------------------- |
| Web          | `http://localhost:3082`                            |
| API          | `http://localhost:8087`                            |
| PostgreSQL   | Loopback `15462`, database `clientops_portal_demo` |
| SMTP capture | Loopback `11062`                                   |
| Mailpit      | `http://localhost:18062`                           |

Local environment configuration, launchers, logs and fixture metadata live under
ignored `test-results/portal/`. The retained launchers load `env.ps1`; no literal
`.env` file was present at documentation time. Keep any local `.env`, credentials
and session state untracked. Do not reset other preview/development databases or
reuse this retained demo database for destructive test suites. Mail stays local.

## Screenshot Protocol

Before source: `ae6d93e`, captured before portal edits. Retain
`test-results/portal/before/` unchanged. After source must be the final
implementation commit, recorded in the capture manifest; existing intermediate
captures are not final-head evidence by themselves.

Match role, route, fixture state, navigation state and scroll position. Dashboard
pairs use Admin/Developer/Client, light/dark, 1440x1000 and 390x844, DPR 1, and
reduced motion. Wait for authorised data and fonts; match full-page versus viewport
capture mode. The retained ticket is `4e08c8ea-e7c4-4eda-acc9-37cb9418256a`, with
scope revision 2 pending. Additional route captures follow the route inventory;
dashboard coverage does not imply every route has every theme/viewport pair.

Keep after captures separately under `test-results/portal/after/`; record final
source, render mode, filenames and hashes before asserting matched final evidence.
Dashboard implementation-check captures in `test-results/portal/dashboard-check/`
are viewport captures and must not be passed off as matched full-page baseline
pairs. The original #37 evidence remains untouched.

## Verification Status and Reproduction

Local implementation checks passed: 209 API tests in 23 files, 34 verification
helpers, lint, typecheck (API/web/E2E), both production builds, formatting and the
no-change migration-generation check. The test database is separate from the demo:
`clientops_portal_test` on loopback 15462. The preview runs the production Next.js
build but uses explicitly disposable development-mode API configuration; it is
not evidence of production HTTPS or deployment acceptance.

The read-only role/resilience browser run passed two scenarios. Native Chrome
200% zoom passed all three roles in light and dark, including axe, drawer focus
containment/restoration and document-overflow checks. Measured CSS width changed
from 1422 to 711 and DPR from 1 to 2. Reports retain their actual source revision
and dirty-tree flag, rather than claiming an intermediate result was a clean
final-head result. Route-specific preliminary results are recorded separately.

Initial hosted run [43468199211](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/43468199211)
tested `46c1b2883a36eb9bc40603824b861be21a65b98c`. The routes and inherited review
browser jobs passed. The new dashboard decision scenario failed because opening
the observer's already-current URL/hash did not reload a revision changed by
another session. Its snapshot still showed PROPOSED. The test now explicitly
reloads and checks persisted state; no assertion, permission or timeout was
relaxed. The portal does not claim live multi-session updates. Keep that failed
artifact associated with its original revision; a subsequent pass does not erase it.

The initial core browser job also failed eight scenarios on outdated presentation
contracts: login readiness waited for the now-collapsed Ticket breakdown content;
ticket result text now includes its page; developer follow-up and installation
checklist labels changed. Assertions were updated to the actual named controls,
opening disclosure content when testing it. Authentication, privacy, counts,
decisions, errors and persistence assertions remain. Separately, review reproduced
and fixed Create/Invite actions retaining edit mode and project-filter reset
retaining its URL parameter. A focused production-preview regression passed.

The final local API rerun at the unchanged application source passed 209/209 in
117.82 seconds. An earlier rerun omitted the custom Mailpit ports and failed setup;
it was stopped, then run with SMTP_PORT=11062 and MAILPIT_URL=http://localhost:18062.
No test or timeout change was used to address that environment mistake.

Run 43471024095 at c059594 was stopped at the core privacy gate because the route
evidence document contained a workstation-specific path. It was replaced with a
portable worktree-relative instruction. This was personal path metadata, not a
reported credential; the earlier review commits remain in history. The browser
artifact gate then also failed closed because no core browser report existed.
Neither gate was disabled or relaxed.

Run 43471981764 at fffda836 passed both portal jobs but the inherited intro test
hit `clock.runFor: Target page, context or browser has been closed`. The failure
snapshot still contains the open login dialog. Installed Playwright 1.63.0 runs
clock steps in every context frame; axe 4.13.0 creates and closes a temporary
results page. Their concurrent lifetimes explain this clock-operation race, not
an application login timeout. Only the intro's scan uses axe's documented
same-page mode now, with an explicit zero-frame assertion so no cross-origin
content can silently escape analysis. The WCAG tags, timer, focus, zoom and
completion assertions are unchanged; other application scans keep default axe.
No error is caught or retried and no timeout is increased.

Run from the worktree's `clientops-tracker` directory with Node 24, pnpm 9.15.4,
Docker and a separately designated test database. Supply the local test URL
privately as `TEST_DATABASE_URL`; do not point it to the retained demo database.

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:verification
pnpm build
pnpm format:check
node scripts/check-migration-generation.mjs
$env:NODE_OPTIONS = '--use-system-ca'
pnpm audit --prod
pnpm audit
```

The full audit reports two moderate findings, not a clean security result:
Kit 0.31.11 / esm-loader 2.6.5 / core-utils 3.3.2 / esbuild 0.18.20
(`GHSA-67mh-4wv8-2f99`) and typescript-eslint 8.61.0 / typescript-estree 8.61.0 /
minimatch 10.2.5 (`GHSA-g3hv-75wg-m249`, repeated paths to one installed version).
No dependency was upgraded or finding accepted here. The production audit has
zero known findings; it does not cover these tools, OS packages or application
security. The inherited #22 CSRF/cookie review remains independent and unresolved.

For the running local preview (fresh isolated Chrome profiles, no personal profile):

```powershell
$env:VERIFY_URL = 'http://localhost:3082'
$env:VERIFY_API_URL = 'http://localhost:8087'
$env:WORKFLOW_MAIL_URL = 'http://localhost:18062'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
pnpm test:e2e e2e/meridian-portal.spec.ts --grep 'three roles|fixture-only'
node scripts/verify-portal-zoom.mjs
node scripts/capture-meridian-portal.mjs
```

Full decision tests create fictional records and invitations. CI runs them in a
fresh disposable HTTPS Compose stack, independently from the routes, core and
intro/review jobs, retaining production auth limits:

```sh
node scripts/hardening-stack.mjs start
E2E_ALLOW_DISPOSABLE_DEMO=true VERIFY_URL=https://localhost:8443 pnpm test:e2e e2e/meridian-portal.spec.ts
E2E_ALLOW_DISPOSABLE_DEMO=true VERIFY_URL=https://localhost:8443 node scripts/verify-portal-zoom.mjs
node scripts/hardening-stack.mjs stop
```

The routes job starts its own fresh stack and runs `e2e/portal-routes.spec.ts`.
Do not reuse these destructive verification fixtures for a retained preview or
customer database. HTML results: `playwright-report/index.html`; structured results:
`test-results/browser-results.json`; zoom: `test-results/portal-zoom/portal-native-200.json`.

## Evidence and Remaining Acceptance

The [matched captures](assets/screenshots/meridian-portal/README.md) retain their
source revisions, conditions and hashes. After captures are from clean
`304e02017ecab2310aec36cbc7020dced25b8709`; subsequent test/documentation-only
commits do not change the application source or relabel the images.
All twelve after-dashboard views were visually inspected. Route captures and
accepted-delivery states are additionally produced by their hosted browser jobs.

The final handoff on [PR #43](https://github.com/EdenCirakoglu/Client-Tracker/pull/43)
records the actual tested head, CI run, each job result and artifact digests.
Use that exact revision, not the check count alone. Core, intro/review, dashboard
and route jobs must all pass; a successful scanner execution is not a CSRF policy
approval. A separate Git-connected Cloudflare build is neither application CI nor
evidence about the unchanged public static walkthrough.

Human screen-reader and independent first-visit acceptance are pending. In each
role, read the page title and next-action region, navigate sidebar/theme controls,
open a filter disclosure, submit an invalid form, then reach a permitted decision
or its named-reviewer explanation. Confirm announced labels, focus after errors,
drawer containment and saved confirmation. Record reader/browser versions and
actual spoken output using the [existing task card](FIRST_CUSTOMER_TASK_CARD.md).
Automated axe, keyboard and native zoom checks are not a human walkthrough.

No merge, release, production deployment, public walkthrough change or security
disposition is authorized by this evidence. Parent integration, inherited
CSRF/cookie review and the two development-tool findings remain owner/reviewer
decisions. Trusted HTTPS, SMTP, off-host restore, monitoring and actual operator
acceptance remain separate launch requirements.
