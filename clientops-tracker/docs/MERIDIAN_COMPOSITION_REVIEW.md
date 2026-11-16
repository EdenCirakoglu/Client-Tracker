# Meridian Composition Review

## Candidate and Boundary

November 15 follow-up on `feature/meridian-portal`, draft
[PR #43](https://github.com/EdenCirakoglu/Client-Tracker/pull/43).
Base remains `6b07dee441281b959cbc2cb64fd4e5fdc89fcc56` on
`feature/meridian-ticket-review`. No merge, deployment, security disposition,
dependency upgrade, migration or public walkthrough change is included.

Application checkpoints: `923131d6386dc6e555f58cbc553baaf5ee242778` adds the
composition and shared surfaces; `31fde615b722edfc4f1561ceee264af364ecff65`
limits the developer preview to three records while retaining the full count and
filtered View all. Historical #43 results at `74d7c63` remain historical.
The final tested head, hosted jobs and complete commit-pinned file inventory are
recorded in the PR handoff. Screenshot manifests retain their actual capture head.

## Preview Diagnosis

At entry, nothing listened on port 3082 and Docker Desktop was stopped. The retained
`clientops-meridian-portal` PostgreSQL/Mailpit services were restarted, without
resetting or seeding their volume. The API and production Next preview were started
on loopback 8087 and 3082. The existing build was the November 14 implementation,
build ID `Z740SpRkk6pA_v7E3k-f4`: twelve served CSS/JavaScript assets matched their
on-disk build hashes. Computed styles confirmed genuine Geist, Instrument Serif
and JetBrains Mono, 14px/21.7px body, 232px sidebar and 18px surfaces. The missing
tonal treatment was rendered behavior, not an assumed browser-cache problem.

The web was rebuilt and restarted independently of the API/database. The final
preview build is `oiyEjsZDSVJse0WnKnyHL`. At `7f169909`, all ten served
CSS/JavaScript assets matched the rebuilt files; the browser confirmed the same
fonts and geometry plus the new opaque gradient surface. The
[inspection report](assets/screenshots/meridian-composition/validation/preview-inspection.json)
records the hashes and computed styles.
The retained demo database is `clientops_portal_demo`; API tests use the separate
explicitly disposable `clientops_portal_test`. Neither development databases nor
previous verification volumes were reset. Local regression fixtures add fictional
records; they do not overwrite existing decisions.

## Changes and Reconciliation

| Area                  | Previous implementation                                  | This increment                                                                                                                         | Boundary                                                                                     |
| --------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Dashboard composition | Two long column wrappers inside a 12-column grid         | Direct task, setup, snapshot, release, activity and guidance regions, with role-specific spans                                         | DOM remains setup/decisions/work before supporting data on mobile                            |
| Administrator         | Setup repeated selected name; totals were four full rows | Compact selected-client setup; follow-ups lead; totals are a small 2-by-2 snapshot                                                     | Selected-client ownership and setup eligibility unchanged                                    |
| Developer             | Five preview rows stretched the task grid                | Three assigned records per lane, full scoped total and filtered View all; compact activity strip                                       | Ready, changes requested and waiting retain their existing API definitions                   |
| Client                | Large empty decision, then an empty reply queue          | Short empty state; initial successful empty reply query selects active requests                                                        | Explicit tab choices stay selected; failures never masquerade as empty data                  |
| Surface system        | Uniform flat panels                                      | Shared primary decision, reading/evidence and secondary-summary variants; opaque green-tonal gradients, inset highlight and soft edges | Static cards never lift, blur or become fake click targets                                   |
| Ticket composition    | Extra header/disclosure gaps and taller River            | Smaller context, navigation, disclosure and River spacing; comparison and action appear earlier together                               | Exact revision, full text, reviewer checks, feedback and history retained                    |
| Typography and brand  | Genuine self-hosted faces and journal logo               | Retained Instrument Serif statements, Geist 14px/1.55 reading, sparse JetBrains identifiers, charcoal `#1d2120`                        | Normal letter spacing retained; no replacement logo, simulated signature or invented metrics |

Routes using the existing `Card` inherit the reading surface. Compact operational
tables and form sections remain unframed rather than becoming uniform cards.
Primary treatment is reserved for current decision/action regions; history and
snapshot sections use the quieter summary treatment. Existing selected borders,
focus styles and reduced-motion rules remain. Hover movement applies only to
actual buttons, never reading cards.

## Portal Coverage

| Routes                                                                             | Shared treatment and verification                                                                                                    |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `/dashboard`                                                                       | Direct role grids, populated and empty decisions, both themes; real role, filter/count, retry, responsive and keyboard checks        |
| `/clients`, `/projects`                                                            | Reading surfaces, compact operational tables, form/control tokens; create/edit/reset and retained validation regressions             |
| `/delivery`                                                                        | Scoped follow-up rows and filters; existing targets and next actor preserved                                                         |
| `/tickets`, `/tickets/new`                                                         | List/filter and form surfaces; URL history, mobile cards, labels and error retention                                                 |
| `/tickets/[id]`, `/tickets/[id]/compare`                                           | River, word comparison, primary review rail and quieter decision log; exact-revision real decisions and non-reviewer restrictions    |
| `/releases`                                                                        | Reading surface and real release records; no invented promotion pipeline                                                             |
| `/summaries`, `/summaries/new`, `/summaries/[id]`                                  | Shared reading/editor surfaces and existing immutable briefing hierarchy; publication/retry regression                               |
| `/users`, `/account`, `/guide`                                                     | Invitation/account/setup surfaces; role restrictions and keyboard navigation preserved                                               |
| `/login`, `/set-password`, `/forgot-password`, `/reset-password`, `/access-denied` | Existing account surfaces inherit fonts, controls and opaque treatment; mobile validation, token removal and denied-route regression |

Route existence is not proof of the whole design specification. The detailed
[specification reconciliation](MERIDIAN_SPEC_RECONCILIATION.md) continues to defer
new command search, passkeys, notification centre, calendar manipulation and
release gates. The [route checklist](MERIDIAN_PORTAL_ROUTES.md) retains the original
behavioral inventory.

## Verification and Failure Record

At `923131d`, local lint, typecheck, web production build, 209 API tests, 34 helper
tests, formatting and all 13 focused portal/route browser scenarios passed.
At `7f169909`, the three Meridian role, real-decision and resilience browser
scenarios passed again against the final application build (zero retries/skips).
Frozen offline installation, lint, typecheck and both application builds also
passed for the final application source. Formatting of the added JSON evidence
initially failed; repository Prettier corrected it without changing capture data.
The API build initially failed resolving its config inside the filesystem sandbox;
the identical command succeeded outside it. No application fix or dependency
change was needed for that environment failure.

The first read-only capture harness left a dashboard read in flight before its
next navigation. It now waits for that read to settle. No timeout increased.
A later capture reached the existing auth limiter after repeated local runs:
HTTP 429, measured `Retry-After: 336`. That failed manifest is retained locally;
the next capture passed after normal expiry, without restarting/resetting the
limiter or weakening protection. A capture failure is not reported as a passing
browser run.

The initial visual inspection found excessive developer-column whitespace. The
three-record preview addresses that concrete finding. Before/after comparisons
were recaptured after mutation tests, against the same retained dataset, rather
than comparing different counts. The baseline uses a detached, read-only web
worktree at `8ebccd7f8bca1da53c53bd4b26c1125eae755b96`; its application is identical
to `74d7c63`. Both versions use the same API and origin, not mocks or edited pixels.

[Matched captures and manifests](assets/screenshots/meridian-composition/README.md)
record role, route, viewport, theme, sidebar, scroll, reduced-motion preference,
source revision and SHA-256. Capture success and visual inspection are distinct
from automated accessibility and workflow results. Native Chrome 200% passed on
clean `7f169909` for all roles and both themes: 20 page/drawer checks, axe, focus
containment, Escape and focus restoration. This used Chrome Settings, not CSS zoom.
Fresh final-head hosted results are linked from the PR handoff, not attributed to
the earlier run. The public screenshot manifests identify `8ebccd7` before and
`7f169909` after; later documentation-only commits do not relabel those captures.

## Reproduction

Open <http://localhost:3082/dashboard>. In this disposable preview only, use
Continue as Admin, Developer or Client. Logout switches roles; Account menu selects
Light, Dark or System; desktop navigation collapse persists. The Bluewave empty
decision view uses `bluewave@example.com` and the documented local demo password.
Do not use these credentials or shortcuts for a customer installation.

From the application workspace, with the retained loopback API/preview running:

```powershell
$env:VERIFY_URL = 'http://localhost:3082'
$env:VERIFY_API_URL = 'http://localhost:8087'
$env:WORKFLOW_MAIL_URL = 'http://localhost:18062'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
pnpm.cmd exec playwright test e2e/meridian-portal.spec.ts e2e/portal-routes.spec.ts
$env:UI_EVIDENCE_DIR = 'test-results/meridian-composition/native-zoom'
node scripts/verify-portal-zoom.mjs
```

Browser tests create fictional records. Captures are read-only apart from one
sign-in per role. Set `CAPTURE_TICKET_ID`, `CAPTURE_DELIVERED_ID` and
`CAPTURE_CHANGES_ID` to existing fictional records and `CAPTURE_EMPTY_CLIENT=true`,
then run `node scripts/capture-meridian-portal.mjs`. The screenshot README records
the exact fixture IDs. Do not run multiple large matrices back-to-back inside one
auth-limit window; honor a reported Retry-After without resetting security controls.
Reports: `playwright-report/index.html`, `test-results/browser-results.json`, and
the chosen capture/zoom directory. Test configuration must explicitly name a
separate disposable database; it must never fall back to the demo database.

## Remaining Acceptance

Owner visual-fidelity acceptance remains pending. This is not a pixel-identical
copy of the concept: the approved lighter canvas, real journal mark, additional
review controls, ordinary tracking and actual revision states are deliberate.
Delivery acceptance retains its evidence-first inline form rather than inventing
the concept's release-unlock shortcut. Long real histories still require scrolling.

Human screen-reader and independent first-time usability acceptance are outstanding.
Use the existing [task card](FIRST_CUSTOMER_TASK_CARD.md), recording actual speech,
reader/browser versions, keyboard order, named reviewer and confirmation behavior.
Inherited CSRF/cookie review, dependency-risk decisions and real HTTPS/SMTP/off-host
restore/monitoring/operator acceptance remain separate. No security acceptance,
publication or customer-deployment claim follows from this visual pass.
