# API Reference

The API runs locally at `http://localhost:8080`. With the production Nginx proxy, use `http://SERVER_IP/api` or the configured HTTPS origin. Interactive OpenAPI documentation is available at [`/api/docs`](http://localhost:8080/api/docs) locally or `http://SERVER_IP/api/docs` through Nginx.

Swagger UI is intentionally public in the current build so a reviewer can inspect the contract without a token. It exposes endpoint schemas and examples, not database credentials or application data. Restrict `/api/docs` at Nginx or behind an access layer before treating the deployment as a sensitive production system.

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

Common statuses are `401` for missing or invalid authentication, `403` for insufficient permissions, `404` for missing or inaccessible resources, and `422` for validation failures.

## Authentication

```http
Authorization: Bearer <jwt>
```

Login returns a JWT and a safe user profile. There is no public registration route; local demo users are created by the seed script.

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password123"}'
```

Then use the returned token:

```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <token>"
```

## Endpoint Groups

### Health and documentation

- `GET /health` - public liveness response on the direct API service.
- `GET /api/health` - the Nginx public health route, proxied to the API's `/health` route.
- `GET /api/docs` - Swagger UI and OpenAPI documentation.

### Auth

- `POST /api/auth/login` - verify credentials and issue a JWT.
- `GET /api/auth/me` - return the authenticated safe user profile.

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

Example ticket creation:

```bash
curl -X POST http://localhost:8080/api/tickets \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>","title":"Production site down","description":"The client cannot access the portal.","category":"SUPPORT","priority":"HIGH"}'
```

Example triage flow:

```bash
curl -X POST http://localhost:8080/api/tickets/<ticket-id>/triage-suggestion \
  -H "Authorization: Bearer <internal-token>"

curl -X PATCH http://localhost:8080/api/tickets/<ticket-id>/apply-triage-suggestion \
  -H "Authorization: Bearer <internal-token>"
```

### Releases

- `GET /api/releases` - list releases visible to the current user.
- `POST /api/releases` - create a release; `ADMIN` only in the current API.

### Dashboard

- `GET /api/dashboard/metrics` - scoped totals, status/priority breakdowns and resolution time. `developerWorkload` is omitted entirely for CLIENT users, not merely hidden in the UI. `totalOpenTickets` counts OPEN; workload counts all unresolved tickets; critical count excludes resolved/closed tickets.

Metric definitions (all use the caller's visible tickets):

| Metric                       | Definition                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Open tickets                 | Only status `OPEN`, not every outstanding ticket.                                                                                          |
| Unresolved total             | `OPEN` + `IN_PROGRESS` + `WAITING_FOR_CLIENT`; the dashboard derives this from status counts.                                              |
| Critical tickets             | Priority `CRITICAL`, excluding `RESOLVED` and `CLOSED`.                                                                                    |
| Waiting for client           | Only status `WAITING_FOR_CLIENT`.                                                                                                          |
| Resolved this month          | A recorded `resolvedAt` on or after the current UTC month's start. This is timestamp-based, not a count of current `RESOLVED` status.      |
| Average resolution           | Mean hours from creation to recorded resolution across all visible tickets with non-negative durations; null if none.                      |
| Status / priority breakdowns | All visible tickets, including resolved and closed.                                                                                        |
| Developer workload           | Assigned unresolved tickets per developer, including waiting-for-client tickets. Unassigned tickets are not workload. Internal users only. |

For API compatibility the workload field is still named `openTickets`; the UI
labels it **unresolved**. The current API retains a ticket's recorded resolution
timestamp if it is reopened, so resolution-time metrics are not a measure of the
latest resolution cycle. Lifecycle-aware resolution reporting is future work.

## Authorization Notes

API authorization is enforced server-side. Clients cannot access another client's resources, view internal comments, assign tickets, create clients/projects/releases, or apply triage suggestions. Developers can update tickets and use internal operational workflows; administrators can manage all resources.
