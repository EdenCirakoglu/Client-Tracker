# Roadmap

## Current First-Customer Launch Checklist

Meridian ticket review is a separate, unmerged increment in
[PR #37](https://github.com/EdenCirakoglu/Client-Tracker/pull/37), stacked on #36.
[Revision-specific evidence, preview and manual checks](MERIDIAN_REVIEW.md) cover
the real Revision River, word diff and exact-revision approval. No API/schema,
published release or security-policy change is implied. Preserve the earlier
release results below; retarget and revalidate only after approved parent merges.

Updated 2026-11-10. Main is `cfec6e71a51975e224a2cee9ddda2238183b8b31`
after #20 and #31 merged. Its main CI, both publications and a **new**
digest-pinned registry rehearsal passed. PR #22 now targets main and has been reconciled; it remains draft and unmerged.
The [review handoff](PR22_INTEGRATION.md) separates normal PR CI from the unresolved
CodeQL policy gate.
Historical results below keep their original revisions.

First-customer guidance is a separate candidate on
`feature/first-customer-guidance`, based on #34's
`a6a343cb9f9d278dadf9377f26d6b96d2dd90eb9`. It adds selected-client setup,
role-specific Start here guidance and next-actor explanations without a schema
change. [Current evidence and claims](FIRST_CUSTOMER_READINESS.md),
[reopenable user guide](FIRST_CUSTOMER_GUIDE.md),
[human task card](FIRST_CUSTOMER_TASK_CARD.md) and
[private staging/operator checklist](PRIVATE_STAGING.md) distinguish implementation,
local fixtures, hosted checks and outstanding acceptance. Do not merge this stack
into a parent feature branch; after each separately approved parent merge, retarget
and revalidate the next PR against actual main.

Draft [PR #35](https://github.com/EdenCirakoglu/Client-Tracker/pull/35) is the review
surface. Hosted checkpoint `012fd5910814fa9aedfce8e671d28a577b3ce876` passed
[CI 42859148417](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42859148417).
Local fixture corrections then passed all 18 combined browser scenarios; the PR
handoff records the final head and fresh CI. No missing CodeQL analysis or independent
Cloudflare check is represented as a successful security/release gate.

Branding follow-up: draft [PR #34](https://github.com/EdenCirakoglu/Client-Tracker/pull/34)
is based on verified #22 head `9e25bc27d73ae1756c8fc185223704417de8642b`.
The [v3 identity, fictional walkthrough and Product Hunt draft pack](product-hunt/README.md)
are review-only 0.2.0 preview materials. Owner review, #22 security disposition,
human accessibility and real visitor-path acceptance are outstanding. Retarget
#34 only after #22 is independently cleared and merged; do not merge the stack
into the product branch. No contact, checkout or public launch is activated.

| Task                           | Status / evidence                                                                                                                                                                               | Next action                                                                                                                        | Owner                          |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Published maintenance release  | [Exact cfec6e71 evidence](RELEASE_CFEC6E71.md): pulled images, migrations, login, ticket/comments, two-organisation denial, DB outage/recovery, recreation persistence and logout replay passed | Preserve evidence; do not attribute it to the product candidate                                                                    | Maintainer                     |
| Product integration            | #22 retargeted to main; security/tsup fixes and migration 0007 retained                                                                                                                         | Final-head normal PR CI, audits and CodeQL policy; independent [CSRF review](CSRF_REVIEW.md)                                       | Maintainer + security reviewer |
| Private five-minute demo       | [Runnable private shipment demo](PRIVATE_DEMO.md); existing workflow, not a new approval system                                                                                                 | Review the printed ticket; client changes persist independently of scope, release and resolution                                   | Maintainer                     |
| Selected-client guidance       | Implemented on the #34-dependent candidate; scoped API/role guide/customer journey tests in [current evidence](FIRST_CUSTOMER_READINESS.md)                                                     | Review candidate CI and actual screenshots, then independent first-visit tasks; no parent merge inferred                           | Maintainer + owner             |
| Remaining dependency decisions | Kit/esbuild and minimatch findings remain visible; November 4 Kit deadline expired without approval                                                                                             | Review supported remedies or make an explicit time-limited decision; no acceptance inferred from clean production audit            | Repository owner               |
| Each future approved merge     | None authorized in this run; automatic image publication follows successful main push CI                                                                                                        | Verify exact main SHA CI, both publications and digest-pinned runtime **without rebuilding**, after each separately approved merge | Release maintainer             |
| Meridian ticket review         | [PR #37 and exact evidence](MERIDIAN_REVIEW.md): local 205 API / 34 helper / 3 focused browser tests, production build and native zoom passed                                                   | Review the ticket-first design and final-head hosted CI; preserve parent dependency and security gates                             | Maintainer + owner             |
| Human accessibility            | Automated checks are not a human screen-reader walkthrough                                                                                                                                      | Assign reviewer; record actual speech, versions and issues                                                                         | Accessibility reviewer         |
| Real staging                   | Not accepted; local captured email and certificates are fixtures only                                                                                                                           | Trusted HTTPS/renewal, SMTP, encrypted off-host restore, real alerts/monitoring, recovery owner and RTO/RPO                        | Customer operator              |
| Installation offer and pilot   | [Offer and pilot materials](FIRST_CUSTOMER_PILOT.md) prepared, not approved or purchased                                                                                                        | Approve terms/capacity and genuine booking/checkout; separately authorize pilot contact                                            | Repository owner               |

Historical invitation/restart failure at `5068312` remains unexplained. Keep the
strict diagnostic test; later passes do not establish its cause. No risk acceptance,
alert dismissal, real email, merge, public deployment or checkout activation is
performed in this increment.

## Historical November 6 Integration Context

Integration update, 2026-11-06: the owner merged #20 as `e114a0e` and
[main CI, both publications and digest-pinned runtime verification passed](RELEASE_E114A0E.md).
#31 now targets main and is the next separate tooling review; #22 remains
unmerged with its recorded CodeQL policy finding. Kit acceptance is overdue and
unapproved; the minimatch tooling finding also remains. For **each** future
approved merge (#31, then reconciled #22), require resulting-main CI, both image
publications and digest-pinned runtime verification without rebuilding. Real
staging, human accessibility, approved terms and one paid agency pilot remain
separate owner/operator acceptance gates.

## Historical November 6 Product Checklist

Updated 2026-11-06. This table is the single current launch checklist. All 15 PRs
remain open/unmerged; no auto-merge or queue is authorized. Integration order is
a recommendation for separate decisions: #20, then #31, then #22. Source CI,
scanner execution, scanner policy, published-image verification, real services
and customer acceptance are distinct. Historical results below retain their SHAs.

| Task                               | Status and completion evidence                                                                                                                                                                                                      | Next action                                                                                                                                                                                                               | Owner                                   |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Integrated source release          | Main `38b6ef1`; #20 `4a37eb3` and #31 `c1e1efc` previously passed CI/policy; #22 `f2be503` passed CI/analysis but **failed CodeQL policy**. [CSRF review](CSRF_REVIEW.md) corrects the earlier shorthand and adds focused evidence. | Review final preparation heads/checks in PR handoff. Owner/security decision on CSRF classification; expired November 4 Kit disposition is not approved. New minimatch tooling finding remains visible.                   | Maintainer + Eden Cirakoglu             |
| Each future approved merge         | Not performed in this run; automatic image publication follows successful main push CI                                                                                                                                              | Require exact resulting main SHA CI, both API/web publishing jobs and pulled digest-pinned image runtime verification **without rebuilding** after each of #20, #31 and #22. Then retarget/revalidate the next candidate. | Release maintainer                      |
| Historical reliability discrepancy | Invitation/restart failure at `5068312` remains unexplained; improved safe status/phase diagnostics retained. [Review](CSRF_REVIEW.md#historical-invitation-failure).                                                               | Repeat strict outage/restart checks on final head; do not infer cause from later passes or alter deadlines.                                                                                                               | Maintainer                              |
| Focused buyer journey              | Existing decisions/revisions/notifications retained. [Three same-record concepts and selected concept 3](CLIENT_JOURNEY_BRIEF.md); client-specific onboarding/project overview specified, not shipped.                              | Implement bounded selected direction after integration; reuse existing workflow data and permissions. Printable receipt next; reminders/attachments only on pilot evidence.                                               | Product maintainer + owner              |
| Human accessibility                | Historical axe/keyboard/native 200% passes are not human AT acceptance. [Manual contract](CLIENT_JOURNEY_BRIEF.md#visual-and-interaction-contract).                                                                                 | Record actual screen-reader walkthrough, versions, speech/issues and fixes. No human result recorded yet.                                                                                                                 | Named accessibility reviewer, to assign |
| Real staging services              | **Not accepted**. [Operator runbook](OPERATOR_CONTROLS.md) and [installation guide](INSTALLATION_GUIDE.md) describe fixtures versus real requirements.                                                                              | Supply the private inputs listed below; approve staging; demonstrate TLS/renewal, real SMTP receipt, off-host restore, alert receipt, stopped-host/heartbeat detection and recovery owner/RTO/RPO.                        | Customer operator + owner               |
| Defined installation offer         | [Services](SERVICES.md) and [pricing/handover worksheet](FIRST_CUSTOMER_PILOT.md) prepared, not approved or purchasable. MIT unchanged.                                                                                             | Approve scope, price, support hours/terms/capacity; genuine booking/checkout URLs and test-mode journey, then separate activation approval.                                                                               | Eden Cirakoglu                          |
| One paid agency pilot              | Not recruited or completed; [three-owner interview guide, five-minute demo and proposed 4/5 unaided task](FIRST_CUSTOMER_PILOT.md) ready for review.                                                                                | Approve contacts, obtain consent, run study/install, record actual effort, blockers, payment and accepted handover. No invented feedback.                                                                                 | Owner + named pilot agency              |

The current dependency decision is recorded on maintenance PR #20 in
`docs/RELEASE_INTEGRATION.md`; its November 20 proposal is **not** an extension or
acceptance of the expired November 4 deadline. No broad tooling upgrade is added
here. Before customer installation, resolve or explicitly review every remaining
finding; production npm audit alone does not cover OS packages, CodeQL or logic.

## Historical October 28 Checklist

The following text preserves the prior review, including statuses since corrected
above. It is not a second active checklist or current risk acceptance.

Updated 2026-10-28. The then-current checklist described the initial offer
is assisted installation for one agency, not shared multi-agency SaaS. Public MIT
code remains available without buying a service. Status means only the evidence
listed: source CI, published-image runtime, real-service acceptance and customer
acceptance are separate gates.

Current maintenance follow-up on PR #22: the owner authorized the scoped Zod 4
migration after newly published advisories affected the previously tested lockfile.
See the [dated dependency recheck](DEPENDENCY_REMEDIATION.md#current-recheck-2026-10-28).
The production npm audit is now clean; two esbuild development advisories remain
unapproved decisions due 2026-11-04 or before installation. The former parser
finding has a compatible backport; the braces advisory was withdrawn by its
publisher. The four-decision count in the earlier checklist evidence below is
historical, not the current inventory. PR #20 remains unmerged, and PR #22 remains
stacked on it; neither is authorized to merge in this increment.

The customer-journey increment is implemented: email-to-record navigation, truthful
enqueue outcomes, personal decisions, revision comparison and the delivery-journal
visual slice. Clean local `d3b66ab` verification passed all 14 combined browser
scenarios and native 200%/keyboard/axe checks. See the revision-specific
[review evidence](DELIVERY_JOURNAL.md) and final PR review comment for hosted results.
The `81012cb` captures remain before evidence. Real screen-reader, fresh product-head
CodeQL and external-service acceptance remain pending, not inferred from source CI.

| Task                               | Status                                                                                                               | Tested revision / evidence                                                                                                                                                                                              | Next action                                                                                                                                                                   | Owner                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1. Establish and maintain baseline | #19 merged; #20 draft against main; approved scoped security follow-up on #22                                        | `0f567fd4cf8b71dbd2e64d1c00b180884281dbcc`: [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40679536296); [current dependency decisions](DEPENDENCY_REMEDIATION.md#current-recheck-2026-10-28) | Owner decision on the two remaining esbuild dispositions by 2026-11-04 or first installation; #20 merge and later retarget remain pending. No alert dismissed.                | Maintainer + repository owner   |
| 2. Buyer-facing workflow           | Delivery-journal follow-up implemented and locally verified; draft #22 remains stacked                               | [Revision evidence, hosted links and matched captures](DELIVERY_JOURNAL.md); clean `d3b66ab`: 14 browser scenarios/native zoom; API suite 190 and helpers 28 previously passed                                          | Review final-head hosted result in the PR handoff, then email return paths and notification outcomes; fresh CodeQL after retarget and human screen-reader acceptance pending. | Maintainer + reviewer           |
| 3. Release candidate               | Historical CI/publication verified; current pair has registry metadata but no new published-image runtime acceptance | [Release evidence](RELEASE_READINESS.md), [installation guide](INSTALLATION_GUIDE.md)                                                                                                                                   | Full product CI, approved merge, digest-pinned image verification, populated upgrade/restore and versioned handoff                                                            | Maintainer + repository owner   |
| 4. Real staging                    | Not accepted; fixture tests are not external-service evidence                                                        | [Operator controls](OPERATOR_CONTROLS.md), [deployment guide](DEPLOYMENT.md)                                                                                                                                            | Supply operator inputs below privately; approve separated staging and perform actual acceptance                                                                               | Operator                        |
| 5. Purchasable installation offer  | Service information only; no configured booking or checkout                                                          | [Services](SERVICES.md), [commercial options](MONETISATION.md)                                                                                                                                                          | Agree scope, effort/cost worksheet, price, terms and capacity; configure genuine destinations and test-mode purchase before approval to activate                              | Repository owner                |
| 6. Controlled agency pilot         | Not started; no customer evidence                                                                                    | [Installation acceptance](INSTALLATION_GUIDE.md)                                                                                                                                                                        | Prepare interview/demo/feedback pack, then obtain permission to contact one agency; record usability, support effort and willingness to pay                                   | Repository owner + pilot agency |

### Historical Main Maintenance Update (November 6)

| Task                               | Status                                                                       | Tested revision / evidence                                                                                    | Next action                                                                                                                                      | Owner                           |
| ---------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------- |
| 1. Establish and maintain baseline | #19/#20 merged; #31 refreshed against verified main                          | [Published e114a0e evidence](RELEASE_E114A0E.md), [tsup 9 audit/review](TSUP9_REVIEW.md)                      | Review actual-head CI and CodeQL policy; owner decisions on Kit and minimatch remain unapproved                                                  | Maintainer + repository owner   |
| 2. Buyer-facing workflow           | Onboarding, notifications and delivery journal remain in unmerged #22        | [Historical product handoff](https://github.com/EdenCirakoglu/Client-Tracker/pull/22#issuecomment-6690629304) | After separate #31 decision, reconcile product against approved main and rerun CI/CodeQL; retain migration 0007 worker constraints               | Maintainer + reviewer           |
| 3. Release candidate               | Published maintenance images locally verified; product release still pending | [Exact-main CI/publication/digest checks](RELEASE_E114A0E.md)                                                 | Repeat CI, both publications and pulled-image verification after every future approved main merge                                                | Maintainer + repository owner   |
| 4. Real staging                    | Not accepted; fixture tests are not external-service evidence                | [Operator controls](OPERATOR_CONTROLS.md), [deployment guide](DEPLOYMENT.md)                                  | Supply operator inputs below privately; approve separated staging and perform actual acceptance                                                  | Operator                        |
| 5. Purchasable installation offer  | Service information only; no configured booking or checkout                  | [Services](SERVICES.md), [commercial options](MONETISATION.md)                                                | Agree scope, effort/cost worksheet, price, terms and capacity; configure genuine destinations and test-mode purchase before approval to activate | Repository owner                |
| 6. Controlled agency pilot         | Not started; no customer evidence                                            | [Installation acceptance](INSTALLATION_GUIDE.md)                                                              | Prepare interview/demo/feedback pack, then obtain permission to contact one agency; record usability, support effort and willingness to pay      | Repository owner + pilot agency |

### Operator Inputs (One Outstanding List)

Do not put secret values in issues, chat, screenshots or commits. Supply them
through private operator configuration when the relevant action is approved.

- Domain/DNS and host access; approved hosting/provider budget.
- Independent staging/production secrets and separate database, volume, deployment-state and backup namespaces.
- Authenticated SMTP, verified sender and explicitly approved test recipients.
- Off-host backup destination and encryption-key escrow independent of the host.
- External monitoring, alert recipient, missing-heartbeat policy and security-log retention.
- Named recovery owner, recovery-time target and acceptable data loss.
- Booking/checkout account, approved offer/price/terms/support capacity, and permission for a pilot contact.

No merge, public deployment, spending, live checkout or real-recipient email is
performed by this checklist. Earlier authorization completed PR #17; new launch
candidates remain reviewable before further approval.

## Historical Planning Backlog

The sections below preserve earlier ideas, not a second active checklist. Several
items were subsequently implemented (sessions, durable account email, bounded
queries, backup/restore, monitoring fixtures and migration packaging). Their
actual status is recorded above and in the linked evidence. Subscriptions,
multi-agency SaaS, AI providers, Marketplace integration and broad redesign are
deferred from this launch.

## MVP Polish

- Add richer ticket filtering, pagination, and saved views.
- Show ticket event history and persisted triage suggestions in the UI.
- Improve related-user display names and project/client summaries in API responses.
- Add frontend component and workflow tests.
- Add accessible keyboard and screen-reader refinements.

## Production Hardening

- Historical item, completed by earlier merges: review the secure-session/account-provisioning implementation. See [release evidence](RELEASE_READINESS.md).
- Configure real TLS/domain/renewal, SMTP sender verification and secret lifecycle; local HTTPS and captured mail are not production services.
- Add durable email delivery, account-security audit retention, structured logging, and request correlation IDs.
- Add automated dependency scanning, backups, restore drills, and health monitoring.
- Add production migration packaging and a defined rollback strategy.
- Add pagination and database query performance monitoring.

## SaaS Features

- Tenant-aware organisation administration.
- Extend the implemented invitations/recovery with profile management and notification preferences.
- Custom ticket fields, SLAs, labels, watchers, and saved filters.
- Email and webhook integrations.
- Client-specific branding and configurable workflows.

## AI and Automation

- Add an optional provider-backed triage adapter behind the existing service interface.
- Store explanation and model metadata with provider-generated suggestions.
- Add confidence thresholds, human feedback, and evaluation datasets.
- Automate SLA reminders, ticket routing, release notifications, and summaries.

## Monetisation

- Offer a hosted multi-tenant plan with usage-based or seat-based pricing.
- Offer paid deployment and customisation for small software teams.
- Package premium integrations, reporting, automation, and support tiers.

See [MONETISATION.md](MONETISATION.md) for the product options in more detail.
