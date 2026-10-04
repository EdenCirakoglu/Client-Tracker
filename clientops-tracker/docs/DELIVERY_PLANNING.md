# Delivery Planning

This increment builds on the existing request-to-acceptance workflow. It does not
introduce another helpdesk subsystem or claim market uniqueness. Tickets, portals,
SLAs and automation are already established capabilities in products such as
[Frappe Helpdesk](https://frappe.io/helpdesk). The hypothesis to validate with agencies
is that a coherent record of agreed work, delivery and client decisions reduces
repeated status explanations and scope disputes.

## Implemented Here

- Each new outcome revision records a named active internal owner and an optional
  target date. The client sees these alongside the acceptance criteria before agreeing.
- Delivery ownership is separate from the ticket assignee. Names are revision snapshots,
  not a promise of staff availability; offboarding still needs responsibility reviewed.
- Changing criteria, owner, reviewer or date creates a new revision requiring renewed
  client agreement. Historical decisions and names remain in the record and export.
- `/delivery` shows the latest delivery revision for each ticket and the latest pending
  scope proposal. Project names on `/projects` open a project-filtered delivery plan.
- Dashboard follow-up links show real commitments and decisions, not inferred urgency.
  Existing support queues, metrics and role permissions are unchanged.
- Staff summary drafts include saved overdue and upcoming agreed commitments, separately
  from period activity and manually recorded notes. Publishing remains portal-only.

Release links, named client reviewers, versioned scope approval and published progress
snapshots were already implemented in the local feature branch before this increment.
See [the workflow reference](PRODUCT_WORKFLOWS.md) for those contracts.

## Definitions

| View                                    | Exact meaning                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| Delivery follow-up                      | Latest delivery revisions except ACCEPTED, plus latest pending scope proposals           |
| Past agreed target                      | Latest delivery is AGREED and its target date is before today's UTC date                 |
| Due in next 7 days                      | Latest delivery is AGREED; date includes today and excludes today + 7 UTC calendar days  |
| Outcome agreement needed                | Latest delivery is PROPOSED                                                              |
| Awaiting acceptance                     | Latest delivery is AWAITING_ACCEPTANCE, linked to a release                              |
| Changes requested                       | Latest delivery is CHANGES_REQUESTED                                                     |
| Scope approval needed                   | Latest scope proposal is PROPOSED                                                        |
| All delivery records and pending scopes | Includes accepted latest deliveries; does not list historical or decided scope proposals |

Counts measure **workflow records**, not unique tickets. A ticket with a pending scope
and an outcome can appear twice, with a different reason and section link. A proposed
date is not an agreed commitment. Missing dates do not imply lateness. Delivered work
awaiting acceptance is not counted as overdue delivery. No SLA, completion percentage,
predicted risk or legally binding signature is implied.

Calendar dates are UTC and intentionally have no time-of-day. Summary commitments are a
snapshot at preparation time, not activity in the selected reporting week. Historical
summary JSON remains unchanged. The resolution-time limitation after reopening is unchanged.

## API and Privacy

`GET /api/dashboard/delivery?view=overdue&projectId=<uuid>&page=1&limit=20`

Cookie authentication required. `view` defaults to `followup`, `limit` is 1-50 and
`page` is 1-10000. Unknown query fields/values return 400. Direct foreign project
filters return 404. Lists and all counts use the same tenant scope and repeatable-read
snapshot. Internal users retain their existing all-client visibility; this is not a
developer's personal queue. Clients see only their current organisation.

The `data` envelope contains `items`, `counts`, `total`, `page`, `limit`, `asOf`, `today`
and `through`. Each item includes the ticket/project names, revision/state, owner name,
reviewer, date, release version, factual `reason`, `yourDecision` and permitted `href`.
Only the designated client receives `yourDecision: true`; decision endpoints still
enforce current role, organisation and reviewer identity. No internal comments, triage,
staff email or hidden-event timestamps feed this view.

Clients' own designated decisions come first. Within that grouping, stable order is
overdue agreed dates, changes requested, acceptance, proposals, other;
then target date ascending (null last), creation time and UUID. Count queries cover
the full authorised project scope before filtering/pagination. Dashboard links and the
full page use this same query. A failed request shows retry, not a fabricated empty list.

`POST /api/tickets/:id/delivery` additionally accepts `ownerId` and `targetDate` (ISO date
or null). Omitted owner defaults to the acting internal user. Only active ADMIN or
DEVELOPER accounts are eligible. `GET /api/tickets/:id/delivery/owners` is internal-only,
returns IDs/names of up to 100 active internal accounts and exposes no emails.

## Migration

`0006_hesitant_nitro.sql` adds nullable `target_date`, `owner_id`, `owner_name`, an owner
foreign key and target-date index. Old revisions are not backfilled with invented dates
or ownership. Old API clients can omit the new proposal fields. No seed is required.

```powershell
# From clientops-tracker/, after confirming DATABASE_URL points at the intended database.
pnpm db:migrate
pnpm dev
```

For a real installation use the reviewed migration/deployment procedure, not an ad hoc
production migration with live writers. See [installation acceptance](INSTALLATION_GUIDE.md).

## Deliberately Deferred

| Candidate                                                   | Reason to defer / next validation                                                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Independent milestones and dependencies                     | Validate multi-ticket deliverables first; current commitments belong to individual ticket outcomes                                   |
| Account owner, support agreement, communication preferences | Named reviewers/owners solve the immediate decision boundary; gather actual account-management needs                                 |
| Ticket notifications, mentions and digests                  | Existing outbox sends account messages only; event visibility, recipients, preferences and retry contracts need a separate increment |
| Unanswered-question alerts                                  | No structured question/answer contract yet; comment keywords are not reliable evidence                                               |
| Saved views, labels, templates, bulk actions, attachments   | Avoid broad helpdesk scope before agency workflow validation                                                                         |
| Configurable triage, duplicate suggestions                  | Evaluate real request quality and false positives; current triage remains rule-based, not a live LLM                                 |
| MFA, contractor scope, active session UI                    | Separate security design and regression pass; existing session controls remain intact                                                |
| SLA/retainer reporting                                      | Needs lifecycle/time accounting and business-hour definitions, not current snapshot counts                                           |

## Manual Acceptance

1. As developer, open a ticket, propose criteria, choose an internal owner, target date and
   client reviewer. Confirm the visible details before submitting.
2. As the named client, open Delivery plan and review the decision. Agree it. Other contacts
   can read permitted records but cannot make this decision.
3. Confirm the dashboard count links to the matching view. Test project filtering, reset,
   browser Back and direct links at 390px and desktop widths.
4. Change a target through a new revision: prior agreement stays historical, and the new date
   is not counted as overdue until agreed. Request acceptance with a release: it leaves the
   overdue queue and enters acceptance. Acceptance does not close the ticket.
5. Prepare a summary and review its saved commitments. Internal notes must not appear.
6. Keyboard through navigation, filters, date/owner inputs and decision controls. Use native
   browser 200% zoom. A real screen-reader walkthrough remains separate manual acceptance.

Results and capture locations: [delivery planning verification](DELIVERY_PLANNING_VERIFICATION.md).
