# Screenshot Evidence

## Operations UI: 2026-09-11

All 34 captures in `assets/screenshots/ui/` were opened and visually inspected.
They are real browser captures, not mockups or edited composites. The supplied
generic dashboard informed hierarchy/navigation only; no ClientOps Figma file was
available. Existing teal identity and components were retained.

**Provenance:** `before/` contains ten fresh-profile Chrome captures of the previous
running hardening UI, with baseline branch `5b406be`. Those preserved local
fixtures contain fictional records from earlier browser journeys. Of the 24
`after/` captures, 22 come from the clean hosted run at
`4614642887c69bf112efb32dd59c6dff3d583b9e` using fresh HTTPS/SMTP-capture fixtures.
The two open account-menu captures come from isolated local Chrome at the same
revision, with zero axe violations. Account attachments were decoded losslessly
from the original report. No cookies, token links, TLS keys or real personal data
are shown. Password fields are masked and use fictional local-only credentials.

The [passing CI artifact](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34612080774/artifacts/10268678796)
contains all reports, additional screenshots and upgrade proof. Baseline and final
data are not identical snapshots; changed counts are not before/after performance
claims. Final dashboard captures precede the portal scenario's ticket creation.
The initial demo has eight tickets; the completed scenario adds one.

### Before and After

| Area              | Before                                                            | Inspected final state                                                                                                |
| ----------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| Administrator     | [Dashboard](assets/screenshots/ui/before/admin-dashboard.png)     | [Unassigned queue, four metric links, team context](assets/screenshots/ui/after/ui-admin-dashboard.png)              |
| Developer         | [Dashboard](assets/screenshots/ui/before/developer-dashboard.png) | [My work distinct from Team snapshot](assets/screenshots/ui/after/ui-developer-dashboard.png)                        |
| Client            | [Dashboard](assets/screenshots/ui/before/client-dashboard.png)    | [Reply-needed queue, own organisation and public activity only](assets/screenshots/ui/after/ui-client-dashboard.png) |
| Ticket list       | [Tickets](assets/screenshots/ui/before/tickets.png)               | [Readable names, word wrapping, filters and pagination](assets/screenshots/ui/after/tickets-list.png)                |
| Ticket detail     | [Detail](assets/screenshots/ui/before/ticket-detail.png)          | [Breadcrumb, applied triage, comments and history](assets/screenshots/ui/after/ticket-detail.png)                    |
| Mobile navigation | [Drawer](assets/screenshots/ui/before/mobile-navigation.png)      | [Dark drawer, accessible links and close control](assets/screenshots/ui/after/ui-mobile-navigation.png)              |
| Login             | [Sign-in](assets/screenshots/ui/before/login.png)                 | [Compact branded form and visible focus](assets/screenshots/ui/after/login.png)                                      |
| Recovery          | [Recovery](assets/screenshots/ui/before/recovery.png)             | [Non-enumerating confirmation](assets/screenshots/ui/after/recovery-request.png)                                     |
| Invitations       | [Accounts](assets/screenshots/ui/before/accounts.png)             | [Invitation sent, pending account and readable Resend action](assets/screenshots/ui/after/admin-invitations.png)     |
| Password change   | [Security](assets/screenshots/ui/before/account-security.png)     | [Validation, consistent controls and visible focus](assets/screenshots/ui/after/account-password.png)                |

### Additional States

| Capture                                                                         | Inspection                                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Collapsed navigation](assets/screenshots/ui/after/ui-collapsed-navigation.png) | Focus-triggered Tickets tooltip stays on one line; account actions remain in header   |
| [390px dashboard](assets/screenshots/ui/after/ui-dashboard-390.png)             | Primary action, four metrics and attention queue precede supporting distributions     |
| [Mobile tickets](assets/screenshots/ui/after/mobile-tickets.png)                | Title, status and priority visible together; remaining columns scroll within table    |
| [Pending triage](assets/screenshots/ui/after/triage-pending.png)                | Saved advice loads after refresh without overwriting selected category/priority       |
| [Dark ticket detail](assets/screenshots/ui/after/ui-dark-ticket-detail.png)     | Readable labels, badges, fields and heuristic-score explanation                       |
| [Dark accounts](assets/screenshots/ui/after/ui-dark-users.png)                  | Table and invitation form use consistent surfaces and normal word wrapping            |
| [Mobile accounts](assets/screenshots/ui/after/ui-mobile-accounts.png)           | Focusable table scroll region; form stays inside the page width                       |
| [Long-record reflow](assets/screenshots/ui/after/ui-long-record-mobile.png)     | Deliberate unbroken stress-test title wraps; focused comment remains unobscured       |
| [Dark login](assets/screenshots/ui/after/ui-dark-login.png)                     | Branded form and theme controls remain readable at an effective 768px width           |
| [Invitation setup](assets/screenshots/ui/after/invitation-setup.png)            | Password requirements, confirmation and focus state                                   |
| [Used invitation](assets/screenshots/ui/after/used-invitation.png)              | Single-use link failure is explicit; contact-administrator guidance remains available |
| [Recovery complete](assets/screenshots/ui/after/recovery-complete.png)          | Confirmation explains old sessions ended and provides sign-in destination             |
| [Light account menu](assets/screenshots/ui/after/ui-light-account-menu.png)     | Profile/security, invitations, theme choices and sign out, with no fake actions       |
| [Dark account menu](assets/screenshots/ui/after/ui-dark-account-menu.png)       | Same controls and hierarchy in the dark theme                                         |

### Findings and Limits

The baseline was metric-heavy with no actionable dashboard queue. The new hierarchy
puts real work first, uses four linked snapshots and moves distributions/resolution
context below the queue. Screenshot review found and corrected a vertically wrapped
rail tooltip, split table words and page-wide mobile account overflow. CI exposed
and regression-tested a rapid-filter race. Existing header/scroll, save/error,
history and triage checks remain intact. See [release results](RELEASE_READINESS.md).

The nine browser scenarios include axe, keyboard navigation, focus restoration,
URL/reload/Back behavior, theme/sidebar persistence, 390/768/1280/1440px widths,
short screens and reduced motion. Effective CSS-width reflow is not a manual native
200% zoom test; screen-reader and native zoom acceptance remain outstanding. No
claim of complete accessibility compliance is made. Dark public setup/recovery
screens and additional widths remain in the downloadable report, not duplicated here.

Reproduce with [UI_REFINEMENT.md](UI_REFINEMENT.md#exact-local-verification).
Historical captures and their original evidence follow unchanged.

## Session Hardening: 2026-09-11

These additional captures come from clean code revision
`2341e61432e7087ae7f92c2083b8363d72b97dd5`, using fresh-profile Chrome against
the isolated non-demo account fixture at https://localhost:8444. Fictional
identities and Mailpit only; no real email or public deployment. All three were
visually inspected; labels, validation/confirmation and focus indicators are
readable without overlap. Their axe checks passed in the six-scenario suite.

| Capture                                                                               | State                                         |
| ------------------------------------------------------------------------------------- | --------------------------------------------- |
| [session-account-setup.png](assets/screenshots/session-account-setup.png)             | Initial password setup from an invitation     |
| [session-password-validation.png](assets/screenshots/session-password-validation.png) | Password confirmation error and visible focus |
| [session-recovery-request.png](assets/screenshots/session-recovery-request.png)       | Non-enumerating recovery confirmation         |

Use the [current HTTPS runbook](SESSION_HARDENING.md#isolated-https-browser-verification)
for the retained six scenarios, exact environment requirements and report paths. Additional
account and operational screenshots are attached to the local/hosted browser reports
linked in [release evidence](RELEASE_READINESS.md). The older captures below retain
their original date and revision context; they are not relabelled as current.

## Earlier Portal Captures

Refreshed on 2026-09-08 from the real isolated PostgreSQL/API/Next.js/Nginx stack at
http://localhost:8180, using Playwright with a fresh Chrome profile. These are
application captures, not design mockups or a public deployment.

Desktop viewport: 1440 x 1000. Mobile viewport: 390 x 844. Full-page screenshots
extend beyond viewport height; the navigation overlay capture is viewport-only.
The data is fictional. No tokens, real credentials, personal browser tabs or real
customer records are included.

## Captured Files

| File                                                                          | Evidence                                                                          |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [login.png](assets/screenshots/login.png)                                     | Demo sign-in actions, labelled form and visible keyboard focus                    |
| [admin-dashboard.png](assets/screenshots/admin-dashboard.png)                 | Internal metrics and workload for the clean initial demo                          |
| [developer-dashboard.png](assets/screenshots/developer-dashboard.png)         | Developer dashboard during the ticket workflow                                    |
| [client-dashboard.png](assets/screenshots/client-dashboard.png)               | Scoped metrics with no developer workload or client-directory navigation          |
| [clients.png](assets/screenshots/clients.png)                                 | Two fictional organisations and admin form                                        |
| [projects.png](assets/screenshots/projects.png)                               | Project/client names, status filters and admin form                               |
| [client-projects.png](assets/screenshots/client-projects.png)                 | Only Northstar projects, without creation controls                                |
| [tickets-list.png](assets/screenshots/tickets-list.png)                       | Clean initial tickets, readable relationships and filters                         |
| [ticket-detail.png](assets/screenshots/ticket-detail.png)                     | Internal comment with author name and ticket context                              |
| [triage-pending.png](assets/screenshots/triage-pending.png)                   | Saved suggestion after reload; user category/priority retained                    |
| [triage-applied.png](assets/screenshots/triage-applied.png)                   | Applied state, changed category/priority and one history event                    |
| [client-ticket.png](assets/screenshots/client-ticket.png)                     | Public comment and ticket state; no internal note or triage controls              |
| [releases.png](assets/screenshots/releases.png)                               | Release/project names and admin creation form                                     |
| [client-releases.png](assets/screenshots/client-releases.png)                 | Only the client's release, without creation controls                              |
| [mobile-dashboard.png](assets/screenshots/mobile-dashboard.png)               | Stacked client metrics at 390px                                                   |
| [mobile-tickets.png](assets/screenshots/mobile-tickets.png)                   | Mobile filters and bounded, horizontally scrollable table                         |
| [mobile-navigation.png](assets/screenshots/mobile-navigation.png)             | Keyboard-accessible mobile drawer                                                 |
| [swagger.png](assets/screenshots/swagger.png)                                 | API contract through Nginx on the same origin                                     |
| [ticket-update-saved.png](assets/screenshots/ticket-update-saved.png)         | Developer dropdown changes with visible saved feedback                            |
| [ticket-update-error.png](assets/screenshots/ticket-update-error.png)         | Explicitly injected HTTP 503; unsaved change rejected and previous value retained |
| [mobile-tickets-scrolled.png](assets/screenshots/mobile-tickets-scrolled.png) | Far-right columns reachable within the mobile table                               |

The captures show successive points in one scenario, not identical database
snapshots: the administrator dashboard precedes ticket creation; client views
follow creation, triage and a status change. The final database has nine tickets.
The developer also changes priority/category after applying triage; the applied
suggestion remains historical advice rather than overwriting later manual edits.

The earlier ticket-detail capture misplaced sticky chrome because it started
while scrolled. Live checks at several scroll positions kept the header at y=0;
captures now reset document scrolling first. Viewport-only scroll evidence is
attached to the browser report. Mobile status/priority badges are visible in the
first column, while the remaining columns retain keyboard horizontal scrolling.

## Reproduce

Use [SESSION_HARDENING.md](SESSION_HARDENING.md) for the current checkout. It builds
two new isolated HTTPS fixtures, migrates existing records without reseeding and
runs nine scenarios, including the six retained session/account/portal journeys.
Do not reset prior verification volumes for screenshots.
[BROWSER_TESTS.md](BROWSER_TESTS.md) preserves the older four-scenario HTTP runbook
for historical revisions only. CI uses Chromium; local verification used Chrome.

## Not Yet Captured

- `drizzle-studio.png`: capture the disposable database only. Use the host-address
  database URL for Studio; the Compose-only hostname postgres is not host-resolvable.
- `github-actions-ci.png`: capture only after an actual root CI workflow succeeds
  for the reviewed commit. Local test output is not a substitute.

No Figma reference was available. Existing screenshots supplied by the project owner
were the visual baseline; the application's established design has been preserved.
