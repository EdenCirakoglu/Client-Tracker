# Roadmap

## Current First-Customer Launch Checklist

Updated 2026-10-28. This is the single current launch checklist. The initial offer
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

The customer-journey increment is in progress: email-to-record navigation and
truthful enqueue outcomes first, then personal decisions, revision comparison and
the delivery-journal visual slice. Captured-mail reproduction at `81012cb` confirms
destination loss; baseline screenshots are not evidence for a completed fix.
Real screen-reader and external-service acceptance remain pending.

| Task                               | Status                                                                                                               | Tested revision / evidence                                                                                                                                                                                              | Next action                                                                                                                                                    | Owner                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1. Establish and maintain baseline | #19 merged; #20 draft against main; approved scoped security follow-up on #22                                        | `0f567fd4cf8b71dbd2e64d1c00b180884281dbcc`: [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40679536296); [current dependency decisions](DEPENDENCY_REMEDIATION.md#current-recheck-2026-10-28) | Owner decision on the two remaining esbuild dispositions by 2026-11-04 or first installation; #20 merge and later retarget remain pending. No alert dismissed. | Maintainer + repository owner   |
| 2. Buyer-facing workflow           | Delivery-journal follow-up implemented; final combined verification in progress; draft #22 remains stacked           | [Current revision evidence and matched captures](DELIVERY_JOURNAL.md); [historical 182-test evidence](LAUNCH_PRODUCT.md); current API suite 190 and helpers 28 passed                                                   | Finish final-head CI, review email return paths and notification outcomes; retarget only after approved #20 merge; human screen-reader acceptance pending.     | Maintainer + reviewer           |
| 3. Release candidate               | Historical CI/publication verified; current pair has registry metadata but no new published-image runtime acceptance | [Release evidence](RELEASE_READINESS.md), [installation guide](INSTALLATION_GUIDE.md)                                                                                                                                   | Full product CI, approved merge, digest-pinned image verification, populated upgrade/restore and versioned handoff                                             | Maintainer + repository owner   |
| 4. Real staging                    | Not accepted; fixture tests are not external-service evidence                                                        | [Operator controls](OPERATOR_CONTROLS.md), [deployment guide](DEPLOYMENT.md)                                                                                                                                            | Supply operator inputs below privately; approve separated staging and perform actual acceptance                                                                | Operator                        |
| 5. Purchasable installation offer  | Service information only; no configured booking or checkout                                                          | [Services](SERVICES.md), [commercial options](MONETISATION.md)                                                                                                                                                          | Agree scope, effort/cost worksheet, price, terms and capacity; configure genuine destinations and test-mode purchase before approval to activate               | Repository owner                |
| 6. Controlled agency pilot         | Not started; no customer evidence                                                                                    | [Installation acceptance](INSTALLATION_GUIDE.md)                                                                                                                                                                        | Prepare interview/demo/feedback pack, then obtain permission to contact one agency; record usability, support effort and willingness to pay                    | Repository owner + pilot agency |

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
