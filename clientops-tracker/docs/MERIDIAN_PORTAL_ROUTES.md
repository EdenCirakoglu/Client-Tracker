# Meridian Portal Routes

## Scope

This inventory covers the whole Meridian portal increment: role-specific
dashboards, shared shell and presentation, operational pages, summary and account
flows, and reviewer-aware ticket feedback. The ticket queue API adds personal
workflow filters. No database schema or migration changes are introduced.

Shared navigation is grouped into Workspace, Delivery records and Your account.
The existing role-filtered destinations, theme controls, mobile drawer and account
controls remain. The new portal stylesheet and shared headings, tables, forms and
state components supply the common presentation across routes.

This is an implementation and verification record, not a release or deployment
claim. See [MERIDIAN_PORTAL](MERIDIAN_PORTAL.md) for the broader review and
[MERIDIAN_REVIEW](MERIDIAN_REVIEW.md) for the preceding ticket-review increment.

## Route Inventory and Source Changes

| Route                  | Increment change                                                                                                                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| /                      | Existing redirect to /dashboard remains unchanged.                                                                                                                                                                                                                        |
| /dashboard             | Client decisions lead the client journal; personal workflow lanes lead developer work; selected-client setup and follow-ups lead administrator work. Metrics, releases and activity are supporting information.                                                           |
| /clients               | Compact directory, project-count dependency errors, linked counts, reachable editor and save feedback.                                                                                                                                                                    |
| /projects              | Portfolio result context, explicit client dependency states, edit focus and reachable project form.                                                                                                                                                                       |
| /delivery              | Compact filter and result sections, UTC context, empty-state ticket navigation. Shared delivery rows remain unchanged.                                                                                                                                                    |
| /tickets               | Compact queue hierarchy and staff workflow filter with mobile active-filter context.                                                                                                                                                                                      |
| /tickets/new           | Request and classification fieldsets, dependency failures, retained input, explicit cancel action.                                                                                                                                                                        |
| /tickets/[id]          | Shared shell/presentation changes plus reviewer-aware scope and delivery feedback. Non-reviewers see the named decision-maker; accepted delivery removes repeated explanatory copy while retaining live feedback. Existing revision history and decision controls remain. |
| /tickets/[id]/compare  | Existing read-only comparison route and from/to selection behavior remain. It inherits shared shell, state and presentation changes; its page implementation is unchanged. Back navigation retains the query and #scope anchor.                                           |
| /releases              | Version-led history, complete notes, reachable creation form and dependency/save feedback.                                                                                                                                                                                |
| /summaries             | Briefing archive with preparation metadata, publication state and header action.                                                                                                                                                                                          |
| /summaries/new         | Client/period hierarchy, separate client and ticket-search failures, retry and retained notes.                                                                                                                                                                            |
| /summaries/[id]        | Decision and progress groups, snapshot provenance and a separate publication rail.                                                                                                                                                                                        |
| /users                 | Account directory and access editor, load retry, retained save errors and edit focus.                                                                                                                                                                                     |
| /account               | Aligned security and preference sections; session-ending behavior unchanged.                                                                                                                                                                                              |
| /guide                 | Named workflow steps and selected-client next-step navigation.                                                                                                                                                                                                            |
| /login                 | Compact branded sign-in, secondary demo access and retained full errors.                                                                                                                                                                                                  |
| /forgot-password       | Shared account form: recovery request and generic confirmation.                                                                                                                                                                                                           |
| /reset-password        | Shared account form: replacement, invalid-link and success states.                                                                                                                                                                                                        |
| /set-password          | Shared account form: invitation, invalid-link and account-ready states.                                                                                                                                                                                                   |
| /access-denied         | Existing protected denial route uses the revised shared denial presentation and retains Back to dashboard.                                                                                                                                                                |
| Unmatched routes (404) | Existing Next.js not-found behavior remains; no custom not-found page was added.                                                                                                                                                                                          |

The static /walkthrough/index.html remains unchanged. The /api/docs/ UI remains
Swagger; its OpenAPI description now includes the personal workflow query
contract.

## Contracts

- Table semantics, record links, project-form/invite-account/release anchors and
  login return destinations remain. See the review findings below for two
  editor/filter navigation corrections awaiting rebuilt-preview verification.
- Personal workflow values are ready, changes and waiting. They are staff-only
  and require assignment=mine. Choosing a workflow sets that assignment; choosing
  another assignment clears workflow. Other explicit filters remain in the URL.
- Workflow is not a synonym for unresolved ticket status. A resolved ticket can
  still have requested changes or a pending client decision.
- Snapshot contents, truncation notices, publication review, explicit recipients
  and mail queuing outcomes retain their existing meaning.
- Account tokens remain in memory after removal from the URL. Password validation,
  outcome focus, session invalidation and non-enumerating recovery remain intact.
- Shared DeliveryPlanList is unchanged. The dashboard no longer renders StartHere;
  role-specific primary sections and a guide link replace that entry point.
- Login retains h2#sign-in-heading, the text Sign in, and tabIndex=-1 for intro
  focus. Summary subsection headings now use h3 under the existing Client
  decisions and replies heading and the new Delivery and progress heading.
- Delivery feedback says Delivered - awaiting your confirmation only for the
  designated reviewer; other viewers see Delivered - awaiting client confirmation.

## Read-only Review Findings

- Create client, Create project and Invite account originally only jumped to the
  editor, retaining the existing edit session instead of starting a new record.
- Projects Reset filters originally cleared local state but retained clientId in
  the URL, so reloading restored the client filter.

Both were reproduced through read-only navigation on the production preview at
localhost:3082 before editing. Source fixes now reset the editors before focus
and remove only clientId from the URL with a history entry; status remains
local-only. A single new browser scenario covers all three editors plus reset,
Back/Forward and reload, with one admin sign-in and subsequent writes blocked.
Its execution is pending a parent-managed rebuild. The ten-test run below
predates these fixes and does not verify them.

## Verification

### Preliminary Dirty-Source Browser Run

Executed from the isolated worktree:

the review worktree's `clientops-tracker` directory

```powershell
$env:VERIFY_URL='http://localhost:3082'
$env:VERIFY_API_URL='http://localhost:8087'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:BROWSER_CHANNEL='chrome'
pnpm.cmd test:e2e e2e/portal-routes.spec.ts e2e/usability.spec.ts --reporter=list --output=test-results/portal-routes-verified
```

Actual result: **10 passed (2.4m), exit code 0**, one worker, no retries or skips.
The completion marker was written on 2026-11-13 at 16:48:35 UTC.

The run used the already-running Next.js development preview at
`http://localhost:3082`, with the real API at `http://localhost:8087`.
The launch configuration sets NEXT_PUBLIC_API_URL to that API, uses
`clientops_portal_demo` on loopback port 15462, and captures SMTP locally on
port 11062. The retained launcher commands are:

```powershell
pnpm.cmd --filter @clientops/web exec next dev --hostname 127.0.0.1 --port 3082
pnpm.cmd --filter @clientops/api exec tsx ../../test-results/portal/api.ts
```

Those servers were reused, not restarted for this run. This was the live,
uncommitted integration worktree based on `ae6d93e`, including the shared
shell/style, dashboard, workflow API and route changes present at test time.
It was not a clean commit checkout, production build or hosted CI run. No
immutable source-hash manifest was saved with this list-reporter run, so it must
not be relabelled as verification of a later commit or documentation revision.

| Browser scenario                                                               | Actual result |
| ------------------------------------------------------------------------------ | ------------- |
| portal owned routes fit 1440 dark                                              | Passed, 35.6s |
| portal owned routes fit 390 dark                                               | Passed, 27.5s |
| portal owned routes fit 390 light                                              | Passed, 21.2s |
| personal workflow filters preserve URL history and mobile context              | Passed, 4.6s  |
| mobile editors retain complete errors and input without duplicate saves        | Passed, 8.9s  |
| dependency errors retry and never report unknown project counts as zero        | Passed, 6.0s  |
| summary preview publishes without email and retains review after failure       | Passed, 10.0s |
| public account forms fit mobile and preserve validation and token removal      | Passed, 9.6s  |
| client routes remain read-only where required and staff-only pages deny access | Passed, 11.6s |
| compact mobile filters retain URL, history and access to ticket actions        | Passed, 6.8s  |

The first three cases cover 11 operational/account/guide routes at 1440x1000 dark
and 390x844 dark/light, checking document overflow, individual form-control bounds
and axe WCAG A/AA rules. Separate cases cover summary publication and the four
public account routes. This does not establish an eight-combination route matrix,
dashboard journeys, native 200% zoom, human screen-reader acceptance or snapshot
immutability under subsequent ticket changes.

### Evidence and Fixture Effects

- Console list output records the ten results above.
- `test-results/portal-routes-verified/.last-run.json` contains
  `{"status":"passed","failedTests":[]}`.
- Screenshots and usability attachments are under
  `test-results/portal-routes-verified/`.
- `--reporter=list` overrides the configured HTML/JSON reporters. No HTML report
  or detailed JSON results report was generated for this command; existing
  `playwright-report/` or `browser-results.json` files are not evidence of it.
- The earlier attempt used the same command with
  `--output=test-results/portal-routes`. Its first three cases failed because
  the new assertions counted Next.js's empty route-announcement alert. That run
  was interrupted. Assertions were scoped to main-content alerts before the
  successful run; the earlier failure evidence remains separate.
- The successful run made nine real demo sign-ins: eight in portal-routes and
  one in usability. The interrupted attempt also created authentication state.
  Total auth endpoint requests were not instrumented; the earlier approximate
  budget was an estimate, not a measured server count.
- One real draft summary was created for the first listed client and then
  published with no selected email recipients. The first publication attempt
  was a browser-intercepted 503; the retry reached the API. The published fixture
  remains in the disposable database; its identifier was not retained in the
  test report.
- Client/project/release/ticket/invitation save-failure requests and the password
  reset failure were intercepted in the browser. They did not create those
  records, send invitations or change passwords. Dependency failures were also
  browser fixtures, followed by retries against real reads.
- No database reset, schema migration, auth-limit reset or external email was
  performed by these commands.

### Remaining Gates

- Hosted CI and final-commit integrated browser/build verification: pending.
  The separate meridian-portal suite is not included in the ten-test result above.
- Native browser 200% zoom and the full four-width/two-theme route matrix:
  not run in this focused suite; pending separate evidence.
- Human screen-reader review and independent usability acceptance: not performed,
  pending.
- Unknown-route 404 behavior, root redirect, full ticket comparison and
  reviewer/non-reviewer detail journeys: retained in the inventory, but not
  established by this focused ten-test pass.
- Production deployment and release acceptance: not performed or claimed.
