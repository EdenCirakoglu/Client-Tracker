# Client Delivery Workflows

These are agency product hypotheses, not proven demand or guaranteed differentiators. This increment adds three small workflows to the existing Next.js/Express/PostgreSQL application. It adds no billing system, separate service, live AI provider or automatic external messaging.

## Request to Acceptance

Open a ticket's **Delivery and acceptance** section.

1. An administrator or developer proposes acceptance criteria and designates an active client contact from the ticket's organisation.
2. That contact agrees the outcome or requests changes with feedback. Other contacts may read it, but cannot decide on their behalf. Staff cannot record client acceptance.
3. After agreement, staff link a release from the same project, write client-facing delivery notes and request acceptance.
4. The designated client accepts or records what remains unresolved.
5. A revised outcome creates a new numbered revision requiring agreement again. The previous outcome, release snapshot, decisions, actors, timestamps and feedback remain visible as historical records.

**Release publication, ticket resolution and client acceptance are independent facts.** Neither agreement nor acceptance changes ticket status, priority or resolution timestamps. Scope approval is also a separate decision; it does not imply acceptance of delivered work.

The plain-text **Export client delivery record** action uses an explicit server-side projection. Staff and clients receive the same client-safe content. It excludes internal comments, triage, email addresses and account/session data. Downloads are authenticated and `no-store`; they are not public share links. Delivery criteria, notes and decision feedback are intentionally client-visible.

New tickets preserve their initial title and description separately from subsequent edits. Older tickets have no recoverable pre-feature edit history: their earliest available saved text is captured when the first outcome is proposed. Do not describe this baseline as proof of the original wording of an older edited request.

### State and Concurrency

`PROPOSED -> AGREED -> AWAITING_ACCEPTANCE -> ACCEPTED`

The reviewer may instead choose `CHANGES_REQUESTED` from `PROPOSED` or `AWAITING_ACCEPTANCE`. Staff then create a new revision. Only the latest revision accepts new actions. Prior accepted records remain evidence for their own revision, not the revised work.

Mutations lock the parent ticket within the same database transaction as the revision and public event. A unique `(ticket_id, revision)` constraint prevents concurrent duplicate revisions. Identical decision/delivery retries do not create duplicate effects; conflicting/stale operations return `409`. Up to 100 revisions are supported per ticket in this first version. Reviewer selection lists at most 100 active client contacts.

## Scope Approval

On a **Feature Request**, staff propose scope, exclusions, effort estimate, delivery implications and an optional external quotation/invoice reference. Estimates are descriptive planning values, not tracked hours or accounting records.

Only the designated active client approver in the same organisation can approve, reject or request changes. Rejection and change requests require meaningful feedback. A proposal's scope fields are immutable through the API. **Revise scope proposal** creates a new version in `PROPOSED` state even if the preceding version was approved. Earlier approvals never transfer to a new revision.

Decisions are atomic and idempotent for identical retries. Approval is an operational record in the portal, not an electronic-signature or legal-contract service. There is no automated billing, invoice issuance or scope-to-delivery enforcement in this version.

## Progress Summaries

Use **Progress summaries -> Prepare summary** as an administrator or developer. Select an organisation and the start of a seven-day UTC reporting period. Optionally add upcoming commitments and blocker reasons, each linked to a ticket in that organisation.

The deterministic template includes:

- Resolution and acceptance events recorded during the selected period, presented separately. Reopened tickets show their current status; a resolution event is not a lifecycle performance metric.
- Project releases added during the period, with public notes and links.
- Requests waiting for the client, latest pending scope approvals and latest pending outcome/acceptance decisions, clearly labelled as snapshots at preparation time.
- Staff-recorded upcoming commitments and blocked work with supporting ticket links. Nothing is inferred from hidden notes, invented due dates or urgency scores.

Staff review a private draft, check its suitability for the client, then explicitly **Publish to client portal**. Clients cannot retrieve unpublished drafts, generate summaries or publish them. Publication is idempotent. The snapshot cannot be edited in place; prepare a correction as a new summary. Record links still enforce current access permissions.

**Delivery channel:** portal publication only. No summary email, scheduled weekly send, delivery notification or email receipt is claimed. Account invitation/recovery email is unchanged. Clients open Progress summaries after sign-in, or staff share the authenticated portal URL through their existing communication channel.

Each automatically generated section is bounded at 100 records and explicitly indicates truncation. Summary lists are paginated at 20 records. Staff can search up to 50 ticket matches at a time when linking commitments and blockers. Full authorised scope, rather than the current ticket-list page, supplies each summary query.

## Database and API

Apply additive migrations with `pnpm db:migrate`; **do not reseed an existing database**. Migrations add initial request fields, `delivery_revisions`, append-only `delivery_events`, `scope_proposals` and `progress_summaries`. Runtime grants and backup fingerprints include the new tables. The API runtime cannot update/delete delivery events under the restricted production role.

Cookie sessions and synchronizer CSRF protection apply to all mutations. Current role/organisation is enforced by the authentication middleware on each request. Changing the reviewer's organisation removes access to the previous organisation; disabled accounts cannot sign in or decide.

| Endpoint                                                        | Purpose                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------ |
| `GET /api/tickets/:id/delivery`                                 | Client-safe request/outcome history                          |
| `GET /api/tickets/:id/delivery/export`                          | JSON envelope with a plain-text filename and content         |
| `GET /api/tickets/:id/delivery/reviewers`                       | Internal-only active client reviewer selection               |
| `POST /api/tickets/:id/delivery`                                | New outcome with `expectedRevision`, `reviewerId`, `outcome` |
| `POST /api/tickets/:id/delivery/:revisionId/request-acceptance` | Same-project `releaseId` and public `deliveryNotes`          |
| `POST /api/tickets/:id/delivery/:revisionId/decision`           | `AGREED`, `ACCEPTED` or `CHANGES_REQUESTED`, plus feedback   |
| `GET/POST /api/tickets/:id/scope`                               | Read/propose numbered scope versions                         |
| `POST /api/tickets/:id/scope/:revisionId/decision`              | Designated client approval/rejection/change request          |
| `GET/POST /api/summaries`                                       | Paginated permitted summaries / prepare internal draft       |
| `GET /api/summaries/:id`                                        | Read a permitted immutable snapshot                          |
| `POST /api/summaries/:id/publish`                               | Explicit internal portal publication                         |

Swagger at `/api/docs/` documents bodies, roles, conflicts and CSRF. `GET /api/tickets/queue` also accepts `clientId`, intersected with the user's existing organisation scope.

## Acceptance and Verification

API regressions: `apps/api/tests/delivery.test.ts` and `product-workflows.test.ts`. Browser journey: `e2e/product-workflows.spec.ts`. Use a newly designated disposable database, not the active demonstration or development database. See [BROWSER_TESTS.md](BROWSER_TESTS.md) and the [verification record](PRODUCT_WORKFLOWS_VERIFICATION.md) for the actual environment and results.

Manual checks:

1. Client submits a feature request. Developer proposes scope; client approves version 1. Developer revises it; confirm version 2 needs a new approval.
2. Developer proposes an outcome. Client agrees. Developer links a same-project release and requests acceptance. Confirm ticket status did not change.
3. Client requests changes with feedback. Staff create revision 2; repeat agreement/delivery, then accept. Refresh and export; verify both revisions and decisions remain.
4. Sign in as a second organisation. Direct requests for the record/export and summary return `404`; internal users cannot impersonate a client decision.
5. Prepare a weekly summary with a linked commitment and blocker. Preview before publishing. The client sees only the published snapshot; internal comments and triage never appear.
6. Check mobile layouts, keyboard controls and both themes. Automated axe coverage is not a substitute for a screen-reader walkthrough.

## Commercial Follow-Up

Validate with agencies using real tasks: time spent answering delivery questions, frequency of scope disputes, clarity of approval ownership and whether summaries replace existing manual updates. Do not add subscriptions, billing, seat pricing or a separate tenancy model before demand is established.

Later work, subject to feedback: summary email through a generalised durable outbox; reminders; explicit project-level approver delegation; longer-history pagination; reviewed GitHub links; knowledge capture; and SLA/retainer tracking only after accurate lifecycle and usage data exist. Optional AI requires evaluation, permission-aware retrieval and explicit data/provider controls. The current first-resolution timestamp remains unsuitable for stronger SLA claims.
