# Dashboard Query Contract

All endpoints require the current server session. Roles and organisation membership
are reloaded by authentication middleware. These additions do not widen permissions
or change the legacy `GET /api/tickets` array response.

## Ticket Queue

`GET /api/tickets/queue` returns `data: {items, total, page, limit}`. Items include
the project, client display name and assignee display name. The count is calculated
over the entire authorised filtered scope; count and page share a repeatable-read
transaction. No ticket descriptions are loaded to calculate dashboard metrics.

| Parameter              | Meaning                                                                            |
| ---------------------- | ---------------------------------------------------------------------------------- |
| `status`               | A ticket status, or `UNRESOLVED` for OPEN, IN_PROGRESS and WAITING_FOR_CLIENT      |
| `priority`, `category` | Existing schema enums                                                              |
| `assignment`           | `mine` or `unassigned`; internal users only                                        |
| `assignedToId`         | Exact assignee UUID; internal users only                                           |
| `projectId`            | Project UUID, intersected with organisation scope                                  |
| `search`               | Literal, case-insensitive title/description substring, up to 200 characters        |
| `resolvedMonth`        | YYYY-MM, UTC recorded resolution timestamp in that calendar month; years 1000-9998 |
| `order`                | `newest` (default) or `attention`                                                  |
| `page`, `limit`        | 1-based page, maximum 10000; limit 1-50, default 20                                |

Attention ordering is CRITICAL, HIGH, MEDIUM, LOW, then creation time ascending,
then UUID ascending. Newest ordering is creation time descending, then UUID
descending. Ties are deterministic. Offset pages are bounded, but concurrent edits
can move records between separate requests; refresh to get the current queue.
Unknown or invalid filters return the existing `400 VALIDATION_ERROR` envelope.
Client assignment filters return 403. A foreign project filter returns no records,
not another organisation's records.

## Metrics

`GET /api/dashboard/metrics` retains the original fields and adds
`unresolvedTickets`, `scope`, `generatedAt` and `resolvedMonth`.

- Open is exactly OPEN; unresolved includes OPEN, IN_PROGRESS and WAITING_FOR_CLIENT.
- Critical means CRITICAL and unresolved, not all historical critical tickets.
- Waiting is exactly WAITING_FOR_CLIENT.
- Resolved this month means `resolvedAt` within the returned UTC calendar month.
  It includes CLOSED and reopened tickets retaining that timestamp. This is a
  recorded-resolution count, not a complete lifecycle performance measure.
- Mean resolution time is creation to stored resolution for nonnegative durations.
  Reopening currently retains the first resolution timestamp. No SLA/trend claims.
- Status/priority distributions cover all tickets in the authorised scope.
- Workload counts assigned unresolved tickets, not only OPEN. It is internal only,
  ordered by count then developer UUID, with the first 10 developers returned.
- Internal metrics cover all clients; the developer's personal queue is explicitly
  separate. Client metrics cover only their organisation.

Each metric's destination uses the identical predicate. Snapshot counts can change
between HTTP requests if another user edits records; there are no synthetic trends.

## Activity

`GET /api/dashboard/activity` returns
`data: {items, hasMore, page, limit, before}`. `limit` is 1-30 (default 6).
Pass the returned `before` timestamp to subsequent pages; newest-first ordering
uses creation timestamp then the prefixed source ID. Optional `kind=ticket|release`
filters the same authorised feed. Counts and previews never use hidden events.

Client-visible sources are explicitly allowlisted:

- Ticket creation and status-change events from the client's projects.
- Public comments, filtered using `ticket_comments.is_internal`. Their timestamp is
  the comment's creation time. COMMENT_CREATED events are not emitted a second time.
- Releases from the client's projects, using record creation time, not release date.

Internal users additionally see assignment/category/priority changes, triage
application and internal comments. No comment bodies, internal triage explanations,
raw change values or account email addresses are included in feed previews.
Unknown future event types are excluded until deliberately reviewed.
Release authors are not stored by the schema, so `actor` is null; the UI must not
invent one. Links target the actual ticket or release anchor.

Tests: `apps/api/tests/dashboard.test.ts`, plus unchanged business-history and
triage transaction coverage in `readiness.test.ts`. There is no new migration.
