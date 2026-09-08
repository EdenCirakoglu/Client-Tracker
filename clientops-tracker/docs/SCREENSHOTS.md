# Screenshot Evidence

Captured on 2026-09-07 from the real isolated PostgreSQL/API/Next.js/Nginx stack at
http://localhost:8180, using Playwright with a fresh Chrome profile. These are
application captures, not design mockups or a public deployment.

Desktop viewport: 1440 x 1000. Mobile viewport: 390 x 844. Full-page screenshots
extend beyond viewport height; the navigation overlay capture is viewport-only.
The data is fictional. No tokens, real credentials, personal browser tabs or real
customer records are included.

## Captured Files

| File                                                                  | Evidence                                                                 |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| [login.png](assets/screenshots/login.png)                             | Demo sign-in actions, labelled form and visible keyboard focus           |
| [admin-dashboard.png](assets/screenshots/admin-dashboard.png)         | Internal metrics and workload for the clean initial demo                 |
| [developer-dashboard.png](assets/screenshots/developer-dashboard.png) | Developer dashboard during the ticket workflow                           |
| [client-dashboard.png](assets/screenshots/client-dashboard.png)       | Scoped metrics with no developer workload or client-directory navigation |
| [clients.png](assets/screenshots/clients.png)                         | Two fictional organisations and admin form                               |
| [projects.png](assets/screenshots/projects.png)                       | Project/client names, status filters and admin form                      |
| [client-projects.png](assets/screenshots/client-projects.png)         | Only Northstar projects, without creation controls                       |
| [tickets-list.png](assets/screenshots/tickets-list.png)               | Clean initial tickets, readable relationships and filters                |
| [ticket-detail.png](assets/screenshots/ticket-detail.png)             | Internal comment with author name and ticket context                     |
| [triage-pending.png](assets/screenshots/triage-pending.png)           | Saved suggestion after reload; user category/priority retained           |
| [triage-applied.png](assets/screenshots/triage-applied.png)           | Applied state, changed category/priority and one history event           |
| [client-ticket.png](assets/screenshots/client-ticket.png)             | Public comment and ticket state; no internal note or triage controls     |
| [releases.png](assets/screenshots/releases.png)                       | Release/project names and admin creation form                            |
| [client-releases.png](assets/screenshots/client-releases.png)         | Only the client's release, without creation controls                     |
| [mobile-dashboard.png](assets/screenshots/mobile-dashboard.png)       | Stacked client metrics at 390px                                          |
| [mobile-tickets.png](assets/screenshots/mobile-tickets.png)           | Mobile filters and bounded, horizontally scrollable table                |
| [mobile-navigation.png](assets/screenshots/mobile-navigation.png)     | Keyboard-accessible mobile drawer                                        |
| [swagger.png](assets/screenshots/swagger.png)                         | API contract through Nginx on the same origin                            |

The captures show successive points in one scenario, not identical database
snapshots: the administrator dashboard precedes ticket creation; client views
follow creation, triage and a status change. The final database has nine tickets.

## Reproduce

Follow [isolated stack setup](DEPLOYMENT.md#isolated-local-production-style-run).
Reset only the designated disposable demo before a fresh complete capture run.

```powershell
# From clientops-tracker/, with the isolated stack healthy and freshly seeded:
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:BROWSER_CHANNEL='chrome'
pnpm test:e2e
Remove-Item Env:E2E_ALLOW_DISPOSABLE_DEMO
Remove-Item Env:BROWSER_CHANNEL
```

With no installed Chrome, run `pnpm exec playwright install chromium` and leave
BROWSER_CHANNEL unset. CI uses Playwright Chromium; a hosted run is still pending.

## Not Yet Captured

- `drizzle-studio.png`: capture the disposable database only. Use the host-address
  database URL for Studio; the Compose-only hostname postgres is not host-resolvable.
- `github-actions-ci.png`: capture only after an actual root CI workflow succeeds
  for the reviewed commit. Local test output is not a substitute.

No Figma reference was available. Existing screenshots supplied by the project owner
were the visual baseline; the application's established design has been preserved.
