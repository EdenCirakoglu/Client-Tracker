# API Reference

The API runs locally at `http://localhost:8080`. Production uses the configured HTTPS origin. Interactive docs are at [`/api/docs`](http://localhost:8080/api/docs), or `https://localhost:8443/api/docs/` in the isolated HTTPS fixture.

Swagger UI publishes the contract without authentication, not application data. Its request interceptor obtains CSRF tokens and sends cookies for mutations; sign in through the login operation first. Restrict `/api/docs` at the edge for a sensitive production system.

## Response Format

Successful responses use a stable `data` envelope:

```json
{
  "data": {
    "id": "resource-id"
  }
}
```

Errors use an `error` envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed.",
    "details": []
  }
}
```

Common statuses are `401` for missing or invalid authentication, `403` for insufficient permissions, `404` for missing or inaccessible resources, and `400` for validation failures.

## Authentication

```http
Cookie: __Host-clientops.sid=<opaque signed session id>
X-CSRF-Token: <synchronizer token from /api/auth/csrf>
```

Production cookies are HttpOnly, Secure, SameSite=Lax and host-only. The development
cookie is `clientops.sid`. JavaScript must not try to read the cookie. Login returns
`data: {user, csrfToken}` and rotates both SID and CSRF token. No bearer JWT is
accepted. There is no public registration; an operator bootstraps the first admin
and administrators invite accounts. All unsafe requests require CSRF, including
login, recovery, token consumption and logout. Use `credentials: 'include'` in fetch.

Local disposable curl example (Bash with jq; PowerShell use `curl.exe` and parse
JSON with `ConvertFrom-Json`). The cookie file is a credential: keep it private and
delete it after testing. Only use the example password in an enabled disposable demo.

```bash
umask 077
CSRF=$(curl -fsS -c cookies.txt http://localhost:8080/api/auth/csrf | jq -r .data.csrfToken)
CSRF=$(curl -fsS -b cookies.txt -c cookies.txt -X POST http://localhost:8080/api/auth/login \
  -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}' | jq -r .data.csrfToken)
```

Then use the retained cookie (and the fresh CSRF token on writes):

```bash
curl -fsS -b cookies.txt http://localhost:8080/api/auth/me
```

## Endpoint Groups

### Health and documentation

- `GET /health` - public liveness response on the direct API service.
- `GET /api/health` - the Nginx public health route, proxied to the API's `/health` route.
- `GET /api/docs` - Swagger UI and OpenAPI documentation.

### Auth

- `GET /api/auth/config` - whether local demo shortcuts are enabled.
- `GET /api/auth/csrf` - establish anonymous session and obtain CSRF token.
- `POST /api/auth/login` - verify credentials and rotate the session.
- `GET /api/auth/me` - return the authenticated safe user profile.
- `POST /api/auth/logout` - revoke current session.
- `POST /api/auth/forgot-password` - `{email}`; identical 202 for known/unknown users, mail sent asynchronously.
- `POST /api/auth/accept-invitation` - `{token,password}`; no role/organisation input allowed.
- `POST /api/auth/reset-password` - `{token,password}`; consume link once and revoke all prior sessions.
- `POST /api/auth/change-password` - `{currentPassword,password}`; authenticated, revokes every prior session.

### Account administration

- `GET /api/users` - ADMIN only, safe profiles and account statuses.
- `POST /api/users/invitations` - ADMIN only, `{name,email,role,clientId}`; CLIENT must reference an existing client; internal staff require null. Resending a pending invitation invalidates its old links. Existing active accounts are not overwritten.
- `PATCH /api/users/:id` - ADMIN only, `{role,clientId,disabled}`; applies assignment and revokes sessions. Self-disable/demotion is rejected. Pending accounts must be managed by resending their invitation.

New passwords require at least 12 characters and at most 72 UTF-8 bytes. Invitation
links expire in 24h and reset links in 30min. `LINK_INVALID` covers expired and used
links. `SESSION_EXPIRED` requires sign-in again; `CSRF_INVALID` requires reloading
the form; `429` includes `Retry-After`. Recovery never reveals account existence.
Full defaults and revocation semantics: [security model](SECURITY.md).

### Clients

- `GET /api/clients` - list visible clients.
- `POST /api/clients` - create a client; `ADMIN` only.
- `GET /api/clients/:id` - get a visible client.
- `PATCH /api/clients/:id` - update a client; `ADMIN` only.

### Projects

- `GET /api/projects` - list visible projects.
- `POST /api/projects` - create a project; `ADMIN` only.
- `GET /api/projects/:id` - get a visible project.
- `PATCH /api/projects/:id` - update a project; `ADMIN` only.

### Tickets

- `GET /api/tickets` - list tickets visible to the current user.
- `GET /api/tickets/queue` - bounded filtered page with joined display names and a full-scope total; see the [dashboard query contract](DASHBOARD_QUERIES.md).
- `POST /api/tickets` - create a ticket for an allowed project.
- `GET /api/tickets/:id` - get a visible ticket.
- `PATCH /api/tickets/:id` - update ticket fields allowed by the caller's role.
- `GET /api/tickets/:id/comments` - list visible comments.
- `POST /api/tickets/:id/comments` - add a normal or authorized internal comment.
- `POST /api/tickets/:id/triage-suggestion` - generate a suggestion; internal users only.
- `PATCH /api/tickets/:id/apply-triage-suggestion` - apply the latest suggestion; internal users only.

Ticket creation saves an advisory suggestion without overwriting category or priority.
Only internal callers receive `triageSuggestion`. Internal `GET /api/tickets/:id`
also returns the latest persisted suggestion (or null), `events` and a minimal
assignee display object. Client responses omit suggestions and history entirely.
Public comments include author display names but not author email addresses.
Applying an already accepted suggestion is idempotent and does not overwrite
subsequent manual edits or duplicate history. Generation and application serialize
on the ticket row inside PostgreSQL transactions.

Manual ticket updates use the same row lock and commit status, priority, category
and assignment history atomically with the update. Comment creation and its
history event also commit together. A failed history insert rolls back the change;
repeating an unchanged ticket field does not create another transition event.

Example ticket creation:

```bash
curl -X POST http://localhost:8080/api/tickets \
  -b cookies.txt -H "X-CSRF-Token: $CSRF" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","title":"Production site down","description":"The client cannot access the portal.","category":"SUPPORT","priority":"HIGH"}'
```

Example triage flow:

```bash
curl -X POST http://localhost:8080/api/tickets/<ticket-id>/triage-suggestion \
  -b cookies.txt -H "X-CSRF-Token: $CSRF"

curl -X PATCH http://localhost:8080/api/tickets/<ticket-id>/apply-triage-suggestion \
  -b cookies.txt -H "X-CSRF-Token: $CSRF"
```

### Releases

- `GET /api/releases` - list releases visible to the current user.
- `POST /api/releases` - create a release; `ADMIN` only in the current API.

### Dashboard

- `GET /api/dashboard/metrics` - scoped totals, status/priority breakdowns and resolution time. `developerWorkload` is omitted entirely for CLIENT users, not merely hidden in the UI. `totalOpenTickets` counts OPEN; workload counts all unresolved tickets; critical count excludes resolved/closed tickets.
- `GET /api/dashboard/activity` - bounded permitted ticket events, comment metadata and releases. Client feeds omit hidden/internal sources before paging. `kind=release` powers recent releases. See [query parameters and privacy](DASHBOARD_QUERIES.md#activity).

Metric definitions (all use the caller's visible tickets):

| Metric                       | Definition                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Open tickets                 | Only status `OPEN`, not every outstanding ticket.                                                                                          |
| Unresolved total             | `OPEN` + `IN_PROGRESS` + `WAITING_FOR_CLIENT`; returned as `unresolvedTickets`.                                                            |
| Critical tickets             | Priority `CRITICAL`, excluding `RESOLVED` and `CLOSED`.                                                                                    |
| Waiting for client           | Only status `WAITING_FOR_CLIENT`.                                                                                                          |
| Resolved this month          | A recorded `resolvedAt` within the returned UTC calendar month, excluding later months; not a count of current `RESOLVED` status.          |
| Average resolution           | Mean hours from creation to recorded resolution across all visible tickets with non-negative durations; null if none.                      |
| Status / priority breakdowns | All visible tickets, including resolved and closed.                                                                                        |
| Developer workload           | Assigned unresolved tickets per developer, including waiting-for-client tickets. Unassigned tickets are not workload. Internal users only. |

For API compatibility the workload field is still named `openTickets`; the UI
labels it **unresolved**. The current API retains a ticket's recorded resolution
timestamp if it is reopened, so resolution-time metrics are not a measure of the
latest resolution cycle. Lifecycle-aware resolution reporting is future work.

## Authorization Notes

API authorization is enforced server-side. Clients cannot access another client's resources, view internal comments, assign tickets, create clients/projects/releases, or apply triage suggestions. Developers can update tickets and use internal operational workflows; administrators can manage all resources.
