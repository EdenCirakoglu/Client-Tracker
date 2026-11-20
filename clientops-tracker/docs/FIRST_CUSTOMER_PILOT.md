# First-Customer Review Pack

Prepared 6 November 2026. Proposed research and commercial materials only. No
agency contacted, customer feedback collected, purchase activated or installation
sold. Owner approval is required before recruitment, real email, prices or terms.
Public MIT software stays available without buying the service.

## Three Agency-Owner Interviews

Recruit, with permission, three owners of small software agencies that deliver
ongoing client changes. Prefer different current tools/team sizes; this small
sample informs a pilot, not a market-size claim. Use fictional data in the demo;
ask permission before notes/recording and agree deletion/retention privately.
Do not copy customer records or credentials into GitHub evidence.

30-minute guide:

1. Five minutes: team/client count, who owns delivery, current tools. Ask about
   the last completed change, not whether they like an abstract feature.
2. Ten minutes: how was scope agreed, who could approve, what changed afterwards,
   how was delivery evidenced, and how did they learn the client accepted it?
   Ask for process descriptions rather than private documents.
3. Five minutes: where did status explanations, approval chasing or disputes cost
   time? Record their estimate with confidence/context, not an invented ROI.
4. Five minutes: show the demo below. Ask what differs from their process, which
   state is ambiguous and what would prevent adoption.
5. Five minutes: who approves an installation purchase, acceptable ownership and
   support expectations, budget process, and willingness to pay for the **defined
   service**. A hypothetical yes is not a sale. Ask whether a scoped paid pilot
   would be useful, without creating a commitment or contacting others.

Private notes template: participant pseudonym; consent; current process; recent
example; friction and frequency; exact wording; contradictory evidence; adoption
blockers; service budget/decision process; follow-up permission. Owner synthesizes
patterns after all three; report counts and limitations without invented quotes.

## Five-Minute Private Demonstration

Use a disposable fictional installation with captured mail only. Do not expose
it publicly or send to real recipients. Have records prepared; omit waiting for
SMTP while explaining that queued/accepted/inbox receipt are separate.

| Time      | Presenter action                                                                                      | Product fact to demonstrate                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| 0:00-0:40 | Admin opens Northstar Logistics (Demo), Operations Portal and named contact                           | Scoped organisation, active contact, installation setup versus selected-client journey                        |
| 0:40-1:20 | Client opens CT-104 Shipment reference search with original request                                   | One human-readable request and public conversation; internal note excluded                                    |
| 1:20-2:10 | Staff opens proposed scope/outcome revision; client reviews comparison and decides                    | Approval belongs to a specific revision and authorized reviewer; proposed date is not an agreed target        |
| 2:10-3:00 | Staff links release 1.5.0 and requests delivery acceptance                                            | Release/delivery/ticket resolution/acceptance remain separate; a release is not acceptance                    |
| 3:00-4:00 | Signed-out client follows captured notice, signs in at the same section, requests a change or accepts | Notification conveys a task without granting access; saved outcome survives refresh and prior history remains |
| 4:00-4:40 | Staff previews and publishes a progress summary and explicitly selects eligible contacts              | Client briefing, immutable period/snapshot, actual queue outcome, no internal notes or triage                 |
| 4:40-5:00 | Show handover requirements and ask which step is unclear                                              | Service is installation/configuration/onboarding, not paid access to MIT code                                 |

If a feature is only in the selected design brief, show it as a **proposal**, not
a live capability. The current application can demonstrate the underlying workflow
without pretending client-specific onboarding/project overview already shipped.

## Usability Task and Proposed Threshold

Recruit five representative participants for the pilot study, separately from
the three-owner interviews if necessary. Proposed goal: **at least four of five
complete the task unaided**, with no unauthorized decision or confusion that
delivery means acceptance. This is a small-sample usability threshold, not a
statistically established market result. Record raw completion counts.

Task, read verbatim: "Your agency says the shipment-reference search has been
delivered. Starting from this notice, find what you agreed and what was delivered.
You can now find archived shipments, but active shipments still fail. Record the
appropriate decision and explain what remains unresolved. Refresh and find your
recorded response. Tell us whether the release and ticket status changed."

Begin signed out as the designated client; use the same fictional revision for
all participants and a fresh isolated fixture per participant. Do not coach.
Observer stops unsafe actions; assistance is recorded as assisted, not success.
Record elapsed time, destination found, agreement/version understood, decision
chosen, feedback preserved, refresh result, states explained, help requested,
keyboard/AT issues and participant's own words. Do not count recording consent
or a facilitator reading the task as assistance. Proposed task window: 8 minutes;
record unfinished rather than silently extending it. Pilot owner reviews repeated
blockers before new features. Human AT acceptance uses the separate manual script.

## Installation Offer and Acceptance

One agency, one privately controlled installation, existing workflows. Proposed
scope: configuration/preflight, non-demo admin and contact setup, HTTPS/SMTP,
restricted DB roles, backup/monitoring setup within approved providers, one guided
workflow, operating runbook and handover. Branding limited to existing settings;
no bespoke redesign or implied customization included.

Prerequisites supplied privately: domain/DNS, host access and budget, independent
secrets, authenticated sender/SMTP and approved recipients, encrypted off-host
storage with independent key escrow, alert destination, external monitoring,
security-log retention, named recovery owner/RTO/RPO. No values in chat/Git.

Acceptance requires revision-specific main CI and published images verified by
digest; real trusted TLS renewal/reload; intended recipient receipt of account
and workflow email; restricted runtime roles; scheduled off-host encrypted backup
restored separately; actual alert receipt and external stopped-host/heartbeat
detection; recovery timing and customer workflow/handover sign-off. Fixture passes
do not satisfy these external checks. Follow [operator controls](OPERATOR_CONTROLS.md).

Handover inventory: deployed source/digests, configuration locations (no secret
values), account/provider ownership, key recovery procedure, backup schedule,
restore/upgrade/rollback steps, monitoring/alerts, support boundaries and signed
acceptance issues. Customer retains data/provider accounts unless written terms
assign a named operator. No continuing managed service is implied.

Exclusions unless separately quoted: hosting/provider bills, historical data
migration, custom integrations/development, 24/7 response, ongoing patching and
operations, legal/compliance certification. Proposed support allowance and
business-hour window must be agreed with a timezone and response target before
purchase. Response is not resolution. Emergency/out-of-hours work is not silently
included. Owner approves terms/capacity; obtain appropriate professional review.

## Pricing Worksheet (Proposal, Not a Quote)

All hours below are planning assumptions to validate in the pilot, not measured
effort. Enter local currency and actual private provider quotations before pricing.

| Work item                                    | Planning hours | Actual pilot hours | Notes                                                |
| -------------------------------------------- | -------------- | ------------------ | ---------------------------------------------------- |
| Discovery, preflight, agreed scope           | 2-3            | Pending            | Confirm supported environment and customer access    |
| Host, HTTPS, secrets, runtime configuration  | 3-5            | Pending            | Existing supported architecture, no custom migration |
| SMTP, backups, alerts, restore rehearsal     | 4-6            | Pending            | Real-service acceptance is required                  |
| Accounts, onboarding and workflow acceptance | 2-3            | Pending            | One agency, agreed contacts                          |
| Documentation and handover                   | 2              | Pending            | Customer ownership and recovery steps                |
| Defined post-install support allowance       | 2              | Pending            | Proposed, hours/window/expiry subject to approval    |
| Total                                        | 15-21          | Pending            | Does not include unbounded incident support          |

Worksheet inputs: hourly internal cost `C`; agreed hours `H`; fixed provider setup
costs `P`; contingency fraction `R` justified by access/integration uncertainty;
target gross margin `M`; applicable taxes/fees `T`. Estimated cost = `H*C + P`;
proposed service price before tax = `(H*C + P)*(1+R)/(1-M)`, with `0 <= M < 1`.
Do not double-count support hours in H and an extra support fee. Compare with an
owner-approved fixed-scope quote and measured pilot effort before adoption.

Separate recurring worksheet: VPS, domain renewal, SMTP, backup storage/egress,
monitoring, managed support and taxes; record provider, quotation date, currency,
monthly/annual billing and payer. No invented current provider prices. Customer
charges, maintenance and optional migration/custom work remain separate lines.
Final price, cancellation/refund terms, payment schedule, support window and
capacity are **unapproved**.

## Booking, Purchase and Pilot Evidence

Booking/checkout remain inactive. Owner supplies genuine configured URLs privately
for test-mode verification: booking -> scope confirmation -> approved service
terms -> external provider checkout -> confirmation with next steps -> scheduled
installation. No card handling in ClientOps and no automatic provisioning after
payment. Test cancelled/failed/duplicate payment and confirmation before approval
to go live. Sponsorship is separately labeled funding, not installation purchase.

Pilot completion record: agreed scope/price, operator/customer owners, approved
installation revision, real acceptance evidence, actual installation/support
hours, 4/5 study results (or unmet target), blockers fixed, handover accepted and
payment evidence retained privately. Public report uses only consented aggregate
results. A paid pilot is commercial evidence; CI and generated concepts are not.

Next backlog item: printable client-safe delivery receipt preserving original
request, agreement revisions, release evidence and acceptance attribution.
Reminders/attachments require repeated pilot need; no campaigns, billing system,
shared SaaS tenancy or broad redesign in this increment.
