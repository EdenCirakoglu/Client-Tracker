# Operations UI Refinement

This work extends the secure-session implementation in draft PR #3. It does not
merge that PR, publish images or deploy publicly. Revision-specific results and CI
links are recorded in [RELEASE_READINESS.md](RELEASE_READINESS.md).

## Grounding and Review Boundaries

The local branch and GitHub PR head both started at
`5b406be547e0c8fe47b3f36775a5dc0f7ca2ec69`. Before editing, fresh-profile Chrome
captured the running administrator, developer and client dashboards, ticket list,
ticket detail and mobile navigation. The supplied generic dashboard component was
used for hierarchy and collapsible-navigation inspiration, not copied as a new
application. No ClientOps Figma file was supplied or available in saved context.

The inspected baseline showed functioning tenant boundaries and saved triage, but
a metric-first dashboard without a working queue. Navigation was always expanded,
and the ticket list fetched all visible records before filtering in the browser.
These findings led to separate API and visual commits, preserving the application,
role definitions, history transactions and session/account regression coverage.

## Role Walkthrough

1. **Administrator:** see the organisation-wide unresolved snapshot, then unassigned
   work. Switch to critical requests, open a record or use View all with its filters.
   Supporting information includes team workload, permitted activity and releases.
   Accounts remains administrator-only; the account menu links to invitations.
2. **Developer:** the main queue starts with My work, not the team backlog. The
   metric row explicitly says Team snapshot. Unassigned and critical team queues
   retain existing access. Complex updates and triage stay on ticket detail.
3. **Client:** the scope displays the user's organisation. Your reply needed comes
   first, followed by active support requests. Public updates and releases are
   organisation-scoped. No workload, internal comments or triage activity is sent
   by the activity API. Clients cannot request assignment-based queue filters.

Each metric links to the exact query used by its aggregate. OPEN is one status;
unresolved includes OPEN, IN_PROGRESS and WAITING_FOR_CLIENT. Resolved this month
uses the stored resolved timestamp in the UTC calendar month, including reopened
records whose first resolution is retained. Average resolution is supporting
context, not a complete lifecycle/SLA performance measure. See
[DASHBOARD_QUERIES.md](DASHBOARD_QUERIES.md) for scope, ordering and pagination.

## Visual and Interaction System

- Existing AppShell, PageHeader, UI primitives and Lucide icons are retained.
  Semantic CSS tokens cover neutral surfaces, readable text, borders, teal actions,
  focus, information, warning, danger and completion in both themes. Cards keep the
  established 8px radius and no longer imply clickability with large shadows.
- Desktop navigation is 256px expanded and 72px collapsed. Nested ticket routes
  keep Tickets active. The rail has accessible labels and hover/focus tooltips;
  navigation scrolls independently of its collapse control on short screens.
- The mobile drawer retains focus containment, Escape, focus restoration, inert
  background and close-after-navigation. Header breadcrumbs return to Tickets.
  There is no unsupported workspace switcher or decorative notification count.
- Light, Dark and System use [next-themes](https://github.com/pacocoursey/next-themes)
  and its pre-paint theme script. `clientops:theme` and `clientops:sidebar` store
  preferences only. Authentication remains in revocable HttpOnly cookie sessions;
  these keys contain no token or identity. Storage failures use defaults.
- Four summary cards precede a wider Needs attention queue and narrower supporting
  column. Mobile queue rows show title, status and priority without sideways scroll.
  Full ticket tables retain keyboard-accessible horizontal scrolling, with status
  and priority also repeated beside the title on small screens.
- URL filters survive direct links, reloads and navigation. Reset filters clears
  the scope filters. Failed requests show retry, not fabricated zero counts or an
  empty-state message. Refresh time means the completed metric snapshot.
- `CT-` plus the first eight UUID characters is a readable display reference, not
  a globally unique replacement key; all routes and writes use the complete UUID.
  No artificial urgency, due dates, SLA scores or percentage trends are generated.
- Login, invitation/password setup, recovery and account security reuse the same
  theme, form controls and feedback. Demo shortcuts remain disposable-only.

## API and Data Changes

`GET /api/tickets/queue` adds bounded database filtering, joined display names and
full-scope totals. `GET /api/dashboard/activity` adds bounded permitted events,
public/internal comment metadata and releases. Metrics use SQL aggregates rather
than loading every ticket. Both new endpoints require the existing session.

Every activity branch is tenant-scoped before paging. Public comment activity uses
the comment's own timestamp, not a ticket timestamp touched by a hidden event.
There are no body previews; hidden comments and internal triage cannot influence
client activity entries. Releases have no recorded author, so no actor is invented.
No schema migration was added by the UI refinement; the additive session migration
is still tested against populated legacy business tables without reseeding.

## Exact Local Verification

Run the API quality commands and explicit disposable-test configuration in
[SESSION_HARDENING.md](SESSION_HARDENING.md#api-tests). The suite now contains 60
API/configuration tests: all previous 55 plus five dashboard/queue/privacy tests.

For a separate UI stack, preserve any existing 8443/8444 fixtures:

```powershell
cd "C:\Users\PnP\Desktop\Client Tracker\clientops-tracker"
node scripts/hardening-stack.mjs start --ui
$env:BROWSER_CHANNEL='chrome'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8445'
$env:ACCOUNT_SETUP_URL='https://localhost:8446'
$env:ACCOUNT_MAIL_URL='http://localhost:8028'
$env:E2E_SCREENSHOT_DIR='test-results/ui-screenshots'
pnpm.cmd test:e2e
pnpm.cmd exec playwright show-report playwright-report
```

Requires Node 24, pnpm 9.15.4, Docker Compose/Linux containers, OpenSSL and installed
Chrome (fresh isolated profile). Alternatively install Playwright Chromium and
unset `BROWSER_CHANNEL`. Free loopback ports: 8445, 8446, 8027, 8028. Any corporate
build CA must be supplied as a verified public certificate via `BUILD_CA_FILE`;
never disable TLS validation. Browser acceptance of the self-signed test certificate
is restricted to these loopback fixtures, not production mail or registries.

`--ui` uses only `clientops-ui` and `clientops-ui-accounts` with their own named
volumes and locally built image tags. Existing volumes are not reset. The first
fixture contains fictional demo accounts; the second disables demo mode and uses
`owner@accounts.example` / `Local-owner-passphrase-42`. Captured email is local
Mailpit; nothing is sent to real recipients. Stop without removing volumes:
`node scripts/hardening-stack.mjs stop --ui`.

### Browser Scenarios and Reports

`pnpm test:e2e` executes nine scenarios, not Vitest API tests:

- The six retained session/account/portal scenarios listed in SESSION_HARDENING.
- Role-specific queues, metric-to-list equality, URL filters/reload and privacy.
- Theme/sidebar persistence, nested routes, keyboard/mobile navigation, reduced
  motion and axe checks across portal and public account screens in dark mode.
- Retry/error distinction, long organisation/ticket names, focused controls below
  the sticky header and navigation at a short viewport height.

Viewport coverage includes 390, 768, 1280 and 1440 CSS pixels, plus 360px height.
A 768px effective viewport checks reflow comparable to desktop zoom; it is not
evidence of manually testing native browser 200% zoom. Manual native zoom and
screen-reader review remain useful acceptance checks. Axe is not a claim of full
accessibility compliance.

- `playwright-report/index.html`: browser HTML report and account-flow attachments.
- `test-results/browser-results.json`: results, Git revision and dirty-tree status.
- `test-results/ui-screenshots/`: local UI screenshots; subsequent runs replace them.
- `test-results/ui-upgrade.json`: populated business-table before/after hashes.
- `test-results/browser/`: disposable per-test artifacts; never use its parent as
  Playwright's output directory because that parent also contains private TLS keys.

Root CI uses its default fresh 8443/8444 fixtures, executes the same nine scenarios
with Chromium and uploads reports/screenshots/upgrade hashes, never TLS keys.
Before/after screenshot selection and actual inspection are indexed in
[SCREENSHOTS.md](SCREENSHOTS.md). Local exploratory datasets may contain fictional
records from repeated journeys; clean CI captures begin with a fresh demo fixture.

## Remaining Launch Work

This is a local and hosted-CI verification milestone, not public deployment.
Production still needs reviewed session/account changes, trusted HTTPS/domain,
real SMTP sender/TLS/delivery configuration, secret rotation, backup/restore proof,
monitoring and release/rollback operations. No notification system, SLA accounting,
workspace switching, MFA or live LLM is implied. Other legacy collection endpoints
still need pagination as a future scoped improvement.
