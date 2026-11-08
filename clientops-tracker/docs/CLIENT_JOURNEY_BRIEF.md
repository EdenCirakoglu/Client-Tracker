# Client Journey: Selected Design Brief

Prepared 6 November 2026 for review, not a claim of shipped UI or customer demand.
The owner selected **concept 3, Decision Journal**, in this session. Extend that
direction in the next bounded implementation, after release reconciliation; do
not replace the approval system or restart a broad redesign.

## Comparison and Provenance

Three independent generated concepts use the same fictional delivery decision.
They are proposals, not screenshots of running code. Target viewport: 1440 x 1024;
actual raster dimensions and checksums are in the PR handoff. Existing reference
inspected: [client ticket, 1440 light](assets/screenshots/journal-2026-10-28/after/client-ticket-1440-light.png),
from the October delivery-journal evidence. It is historical, not a November capture.
Figma and Mobbin connectors were advertised but their calls were unavailable;
no Figma file or Mobbin references were retrieved. Product Design and built-in
image generation used the actual local screenshot as grounding.

| Display order | Concept             | Layout tradeoff                                                                                                                                                                           | Artifact                                                               |
| ------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1             | Decision Brief      | Evidence document with a narrow decision panel; clear context, but mobile must move the decision ahead of the long document. Remove redundant radio/button choices before implementation. | [Concept 1](assets/concepts/review-2026-11-06/decision-brief.png)      |
| 2             | Evidence Comparison | Agreement beside delivery evidence; supports comparison, but becomes field-by-field on mobile. Keep feedback before submission in DOM order.                                              | [Concept 2](assets/concepts/review-2026-11-06/evidence-comparison.png) |
| 3, selected   | Decision Journal    | Decision first, independent current facts, then dated evidence. Do not turn the chronology into a universal linear progress state.                                                        | [Concept 3](assets/concepts/review-2026-11-06/decision-journal.png)    |

Shared fixture: Northstar Logistics (Demo), Operations Portal, CT-104 Shipment
reference search. Original request: find archived shipments by customer reference.
Outcome revision 2: find active and archived shipments by customer reference.
Scope approved November 2, outcome agreed November 3, agreed target November 6.
Release 1.5.0 delivered November 5; note: Search now includes archived shipments.
Reviewer: Northstar Demo Contact. Owner: Demo Developer. Ticket **Resolved**,
delivery **Released in 1.5.0**, acceptance **Awaiting your decision**. These facts
are independent. Generated wording/layout is illustrative; stored records remain
the authority. The extra request date in concept 3 is illustrative, not new data.

## Selected Screen Specification

Use the existing AppShell, UI primitives, record links and permissions. Keep the
ticket title as H1, not the generic "Decision Journal" heading in the mockup.
Breadcrumb returns to the filtered ticket list. No duplicate title or explanatory
paragraph repeating the decision heading.

1. **Your delivery decision:** what changed, current reviewer and revision, with
   links to the agreed outcome and delivered release. Feedback field precedes
   Accept delivery / Request changes in DOM order. Existing validation governs
   whether feedback is required; labels and help text must match that rule.
2. **Current facts:** ticket status, linked delivery, client decision. Text labels
   accompany color. Resolution never implies acceptance; publication never
   approves scope. Missing target is "No agreed target", not overdue.
3. **Recorded evidence:** original request, agreement/revisions, delivery and
   previous decisions, each with actual actor/date/version and permitted links.
   Revisions compare previous/proposed scope, exclusions, outcome and target
   field-by-field, labeled Added/Removed/Changed/Unchanged without color alone.
4. Keep the existing detail page for staff edits/triage and public/internal
   discussion. Do not expose internal notes, drafts or triage in client evidence.

No fixed footer obscures controls. Primary decision remains in normal document
flow and reachable before secondary activity. Prevent duplicate submission;
announce saving/success/failure. On stale revision, retain entered feedback,
explain that the record changed and require reviewing the new revision. Never
apply a prior approval to edited scope/outcomes. Unavailable or unauthorized
records have a safe return to the user's list, without revealing another tenant.

## Three Connected Surfaces

| Surface                   | Primary task                                                                          | Data and boundary                                                                                                                                                            | Secondary content                                                    |
| ------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Client home               | Waiting for your decision: scope, outcome and delivery, assigned to the current user  | Reuse personal decision/follow-up records. Show kind, project, revision, factual reason and one authorized review link. Organisation-wide updates remain separately labeled. | Published briefing, then counts/activity. No new unread score.       |
| Staff home                | My commitments needing attention, then client decisions requiring follow-up           | Developer's own records first; administrator can see authorized team scope. Owner, agreed target and reason shown. Proposed dates never count as missed commitments.         | Team workload and statistics secondary.                              |
| Review workspace          | Compare agreement with delivery and record a decision                                 | Existing scope/delivery endpoints, locked revision checks and designated reviewer only. Preserve email return path, query and anchor through sign-in.                        | Immutable earlier decisions and public discussion.                   |
| Project delivery overview | Understand requests, agreements, commitments, releases and acceptance for one project | Bounded, permission-scoped reads of existing records. No inferred project completion percentage or new approval entities.                                                    | Published summaries, related requests and exact filtered list links. |

Published summaries remain client briefings: reporting period, decisions needed,
delivered/accepted outcomes, upcoming agreed commitments, relevant releases.
Snapshot attribution and dates stay visible. A live record link must not imply
that the immutable briefing has been recomputed. Consolidate empty sections;
do not derive public timestamps/previews from hidden events.

## Client-Specific Onboarding

Keep the implemented **Installation setup** checklist; it is installation-wide.
Add a separate administrator-selected client context, not a renamed global count.
Selection is an authorized client ID in the URL, restored on refresh and back.

| Step                    | Completion evidence for that client                                                                                              | Next action                                                       |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Review client details   | The selected client exists and its existing required fields are valid; optional contacts do not become mandatory retrospectively | Open client editor with that client selected                      |
| Create a project        | At least one project belongs to that client                                                                                      | Create project preselected to client                              |
| Invite a contact        | Show invited/pending/active separately; only an active client user with matching client ID satisfies access-ready                | Invite with server-enforced CLIENT role and selected organisation |
| Start the first request | At least one request belongs to one of that client's projects                                                                    | Create request scoped to those projects                           |
| Agree and deliver       | Display actual separate scope, outcome and delivery decisions on that client's request; never infer from another ticket          | Open the next incomplete record, not an unscoped create button    |

Invitation queued/SMTP accepted is not account activation or inbox delivery.
Recheck disabled/moved contacts, deleted records and changed scope. Persist only
the preference to collapse completed setup; compute completion from current
records. Completed setup becomes a compact reopenable row. Empty installation:
Create client first. Missing scope: show explanation, not a false completed step.

## Visual and Interaction Contract

Use shared tokens, not per-screen colors. Preserve deep teal and the current
neutral identity; no all-beige palette, floating sections or decorative charts.

| Token / rule     | Light                                                                | Dark                                                          |
| ---------------- | -------------------------------------------------------------------- | ------------------------------------------------------------- |
| Page / surface   | #f6f7f5 / #ffffff                                                    | #151b1b / #1e2827                                             |
| Text / secondary | #172b29 / #4c625f                                                    | #edf4f2 / #b5c7c2                                             |
| Border           | #d7e2de                                                              | #445b55                                                       |
| Primary action   | #175f58 with white text                                              | #77d2bf with #102520 text                                     |
| Focus            | Two-pixel high-contrast outline plus two-pixel offset; never removed | Same behavior, contrast checked against each adjacent surface |

These are proposed tokens, not a completed contrast audit. Retain semantic
critical/waiting/success badges and test their contrast in both themes. System
mode follows OS preference without first-paint flash; preference storage contains
no credentials. Body 16px, compact metadata 14px, page 28px, section 18px; zero
negative tracking, tabular counts/dates, line-height at least 1.45. Desktop 24px
padding, mobile 16px, 16-24px gaps, 8px panel corners, fine dividers, no static
card shadows implying clickability. Existing icons 18-20px with consistent stroke.

At 390px: title/project, personal decision, feedback/actions, independent states,
agreement/delivery comparison stacked by field, history, discussion. No horizontal
scroll required to decide. At 768px keep a single main reading column until both
columns remain readable; test 1280/1440 and short viewports. Long organisation and
ticket names wrap. Native 200% zoom must retain every action and focus target.
Reduced-motion disables nonessential transitions; no animated progress fiction.

Keyboard: skip link, landmark navigation, logical heading order, visible focus;
drawer Escape/focus trap/return retained. No hover-only context. Forms use labels,
descriptions and field-linked errors; error summary links to fields. After a
successful decision announce it once and focus the updated outcome heading.
Do not move focus on background refresh. Screen readers announce independent
statuses, comparison labels, actor/date/version, and loading/error text. Human
walkthrough with NVDA/Firefox or VoiceOver/Safari is **outstanding**; axe is not a
substitute. Record browser, AT version, task, observed speech and issues, not just
"passed". The mockups have not undergone runtime keyboard/contrast/AT tests.

## Bounded Implementation and Acceptance

First implement selected-client read aggregation and project context, then apply
the selected hierarchy using existing controls. No schema changes expected;
confirm against actual APIs before promising this. New bounded queries need
cross-tenant and pagination coverage. No copied notification or approval engine.

- Cross-client records cannot complete onboarding; invited is not activated.
- Each personal action matches the designated reviewer and current revision.
- Signed-out email -> sign-in -> original section -> permitted decision -> refresh.
- Stale revision, revoked contact, opt-out and duplicate notices retain safeguards.
- One project's overview cannot include another project's internal/public records.
- Empty, failed and stale data are distinct; retry does not fabricate zero counts.
- Capture matched client/staff views and comparison at 390/768/1280/1440, both
  themes, long names, short viewport and native 200% zoom. Keep historical files.

Measure the proposed usability task in [the pilot pack](FIRST_CUSTOMER_PILOT.md).
No claim of uniqueness or validated commercial demand follows from these designs.
Printable client-safe delivery receipt is next in the backlog; reminders and
attachments require repeated pilot evidence. Billing automation and shared SaaS
tenancy remain excluded.
