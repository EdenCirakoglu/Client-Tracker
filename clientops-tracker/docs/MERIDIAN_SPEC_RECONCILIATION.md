# Meridian Specification Reconciliation

## Boundary

This is the November 14 visual follow-up to draft PR #43, not a replacement app.
The supplied `ClientOps-Meridian-Design-Spec.md` (v1.0, November 10) defines the
visual reference. The owner's later instructions retain the journal v3 logo and
`#1d2120` dark canvas. Real API records, PostgreSQL persistence, sessions, permissions,
routes, email anchors and independent scope/delivery/acceptance decisions take
precedence over the specification's fictional data and blank-repository prompt.

PR #43 remains based on `feature/meridian-ticket-review` at
`6b07dee441281b959cbc2cb64fd4e5fdc89fcc56`. The previous complete verification at
`79c71b7e6503c746c5b55583befeafa0619b7c37` remains historical evidence for that
revision. This follow-up changes no API, schema, migrations, dependency versions,
security policy or public walkthrough. Retarget only after separately approved
parent integration, then revalidate against the actual new base.

## Reconciliation

| Specification             | Previous implementation                                                                     | Change made / retained behavior                                                                                                                                           | Explicit boundary or deferred capability                                                                                                  |
| ------------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| 2.3 palette and brand     | Charcoal canvas, teal accents and journal v3 already present                                | Retained both themes and labelled semantic status colours                                                                                                                 | Near-black canvas and replacement mark rejected by owner; no decorative glow/orbs                                                         |
| 2.3 typography            | Three self-hosted families; 30px portal title and 40px ticket hero                          | 40px desktop / 32px mobile statements, 48px desktop / 32px mobile ticket hero; 14px/1.55 base and diff; genuine Instrument Serif italic face loaded; no synthesized faces | No viewport-relative font sizing; normal tracking retained for readability, including short uppercase mono eyebrows; no decorative hashes |
| 2.3 space and shape       | Mostly 8px surfaces, 6px controls, flat dashboard sections                                  | Shared 18px reading / 14px existing inner surfaces / 12px buttons / 10px inputs; opaque cards, restrained inset highlight and shallow tonal depth                         | Reading cards never lift or blur; no new interactive-card pattern is invented merely to animate it                                        |
| 3.1 navigation            | 256px expanded / 72px collapsed with persisted preference                                   | 232px expanded / 72px rail, 44px minimum navigation targets; destinations and keyboard tooltips retained                                                                  | Existing focus-contained mobile drawer retained, not replaced with a second bottom navigation system                                      |
| 3.2 header                | 72px baseline with account, breadcrumb and real New ticket action                           | 64px desktop minimum, 68px mobile minimum; content may grow; account/theme/logout retained                                                                                | No notification bell or workspace switcher without implemented authorized behavior                                                        |
| 3.3 command layer         | Not implemented                                                                             | No dummy search input added                                                                                                                                               | Entity/action search and command palette require separately scoped product work                                                           |
| 3.4 page header           | Shared serif heading, compact metadata                                                      | Larger page statements; 32px desktop / 24px tablet / 16px mobile gutters; 1440px outer content maximum                                                                    | Fixed sizes respond at breakpoints; lengthy real titles wrap rather than truncate essential text                                          |
| 4 surfaces/forms/dialogs  | Shared Card/Button/Input and native review dialog                                           | Radius tokens apply across operational and account routes; 24px desktop review-sheet edge, full-width mobile sheet                                                        | No new confirmation or signature semantics; existing errors, pending states and focus restoration retained                                |
| 5.1 dashboard composition | Two unframed columns with 32px gap; tall setup section                                      | Twelve-column grid, 16px gaps, eight-column primary tasks and four-column support at wide sizes; single-column task-first reflow                                          | No invented delivery pulse, SLA, client health, forecast, comparison percentages or synthetic chart history                               |
| 5.1 administrator         | Selected-client setup above follow-ups                                                      | Compact full-width selected-client setup with next action alongside; commitments and request follow-up dominate the working column                                        | Other clients still cannot satisfy selected-client steps; invitation is not activation                                                    |
| 5.1 developer             | Assigned ready/changes/waiting queues already implemented                                   | Primary queue gets the dominant reading surface; team totals remain explicitly secondary                                                                                  | No permission change or new readiness/approval inference                                                                                  |
| 5.1 client                | Personal decision and organisation request sections already implemented                     | Stronger personal decision statement, reviewer/project context, prominent real review action                                                                              | No pending decision yields the existing truthful empty state, not a fabricated delivery date                                              |
| 5.2 ticket lists          | URL filters, compact rows and mobile cards                                                  | Shared type/control/surface tokens carry through                                                                                                                          | Saved views, board view, bulk actions and SLA columns remain new product behavior, not visual omissions                                   |
| 5.3/5.4 ticket review     | Stored Revision River, word diff, review rail and exact-revision confirmation               | Larger hero and decision statement, 16px main/rail gap, rounded opaque River/diff/evidence cards; stacked readable mobile diff                                            | No fake R3, signature, hash, release gate, promised response time or automatic acceptance; inline comments/focus mode deferred            |
| 5.5 delivery plan         | Scoped factual follow-ups and agreed/proposed target distinctions                           | Existing list and filters retained with shared tokens                                                                                                                     | Calendar dragging, dependency timeline and forecasts require new product behavior                                                         |
| 5.6 releases              | Real version/date/notes and linked delivery evidence                                        | Shared surface/control refinement                                                                                                                                         | Release promotion pipeline and approval gates are not implemented or advertised                                                           |
| 5.7 summaries             | Immutable published briefing with decisions/outcomes first                                  | Existing reading hierarchy and new shared surfaces retained                                                                                                               | Public sharing, PDF and synthetic topography charts are not added; existing authenticated links/export remain                             |
| 5.8/5.9 account flows     | Real password/invitation/recovery, cookies and notification preferences                     | Same fonts, cards, inputs, buttons, focus and theme support                                                                                                               | No simulated passkeys, magic links, sessions UI or in-app notification centre                                                             |
| 6 motion                  | Bounded intro and receipt transitions; reduced-motion override                              | Retained restrained existing motion; static reading surfaces                                                                                                              | No hover movement on noninteractive cards; no simulated approval ritual                                                                   |
| 7/8 accessibility         | Responsive drawer, semantic diff, keyboard River, review dialog, axe and native zoom checks | Proportion regression added to real role journey; matched captures and native zoom rerun                                                                                  | Human screen-reader and independent first-time usability acceptance remain pending                                                        |
| 10 implementation         | Existing pnpm/Next/Express/Drizzle/PostgreSQL                                               | No stack, dependency, migration or backend changes                                                                                                                        | Blank repository, mock persistence and simulated decisions explicitly do not apply                                                        |

The specification is **not wholly implemented**. Route existence does not establish
support for the proposed search, calendar, notifications, passkeys or release gates.
Performance budgets and human usability targets in the document are targets, not
measurements from this visual pass.

## Integrated Regression

Fresh CI at `9725caf` exposed a shared-grid defect in the staff summary reader:
older operational pages did not use the dashboard's primary-stack class, so their
main content occupied one of twelve columns. The failed summary-publication
assertion and screenshot are retained in run `43613560658`, route job
`132503630873`. This was an application regression, not a timing failure.
The correction assigns full-width stacked spans to every workspace child and an
eight-column desktop span to primary content. Route checks now assert usable
reading widths as well as overflow and publication behavior. No assertion was
removed, retry added or timeout increased. Final results belong to the later PR
head, not the failed run. The dashboard/ticket comparison captures below predate
this operational-page correction and retain their original attribution.

The same run's broader dashboard regression also exposed an intrinsic grid-size
issue with unbroken organisation names. In a read-only synthetic-text diagnostic,
the 390px viewport expanded to 863px; explicit `minmax(0, 1fr)` tracks restored a
390px document without hiding or truncating the text. The existing real-record
long-name test is retained, with a focused snapshot-boundary assertion added.
No database records were changed by the diagnostic. Its result is not a real-data
product screenshot or a substitute for the final full browser run.

## Evidence and Reproduction

Application-source checkpoint: `3297183` (full SHA in the screenshot manifest).
Before checkpoint: `7814b66`, whose application tree is identical to `79c71b7`;
only the read-only capture harness changed. Both sets use the same retained
fictional records, role, theme, viewport and sidebar setting. The before/after
manifests and complete SHA-256 list are in
[the matched screenshot directory](assets/screenshots/meridian-fidelity/README.md).
Final tested PR head and hosted results are recorded in the PR handoff, not
retroactively attached to the earlier screenshots.

Run from the application workspace, with the documented isolated portal preview
running. This capture command never mutates business records:

```powershell
$env:VERIFY_URL = 'http://localhost:3082'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
$env:CAPTURE_TICKET_ID = '4e08c8ea-e7c4-4eda-acc9-37cb9418256a'
$env:UI_EVIDENCE_DIR = 'test-results/meridian-fidelity/new-capture'
node scripts/capture-meridian-portal.mjs
```

`CAPTURE_TICKET_ID` must be an existing fictional ticket in this disposable preview.
The command allows one sign-in per role and read requests only. It refuses external
origins and non-login writes. Omitting it retains the original dashboard-only matrix.
The early harness failures (navigation not awaited, heading case, preference reset
on navigation) were corrected without changing application behavior or increasing
timeouts. Their failed local manifests remain separate from the completed set.

Focused browser verification creates new fictional records; do not run on customer
data. API tests use the separate explicitly named test database, never the preview:

```powershell
$env:VERIFY_API_URL = 'http://localhost:8087'
$env:WORKFLOW_MAIL_URL = 'http://localhost:18062'
pnpm exec playwright test e2e/meridian-portal.spec.ts
$env:UI_EVIDENCE_DIR = 'test-results/meridian-fidelity/native-zoom'
node scripts/verify-portal-zoom.mjs
```

The local preview environment sets development mode for the API. For a production
web build after loading that environment, explicitly set `$env:NODE_ENV='production'`
before `pnpm build`; otherwise Next's error-page prerender can fail. No application
lint or build safeguard is disabled. The normal CI build uses its standard clean
environment and does not source the private preview configuration.

## Review and Launch Boundary

Open <http://localhost:3082/dashboard>. Sign in with Continue as Admin, Developer or
Client in the explicitly disposable demo. Use Logout to switch role and Account
menu to choose Light, Dark or System. Desktop collapse/expand is persistent.
Do not submit a decision on the retained screenshot ticket during a read-only review.

The existing [route checklist](MERIDIAN_PORTAL_ROUTES.md) remains the functional
inventory. Automated browser evidence is not a human screen-reader walkthrough.
Inherited CSRF/cookie review, tooling-risk decisions and real hosting/SMTP/backup/
alert acceptance remain owner/reviewer work. Local fixtures and passing source CI
do not verify published images or authorize a customer deployment. PR #43 stays
draft and unmerged; no policy, image publication or Cloudflare walkthrough change.
