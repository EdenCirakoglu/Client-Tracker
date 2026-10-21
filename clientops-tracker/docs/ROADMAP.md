# Roadmap

## Current First-Customer Launch Checklist

Updated 2026-10-21. This is the single current launch checklist. The initial offer
is assisted installation for one agency, not shared multi-agency SaaS. Public MIT
code remains available without buying a service. Status means only the evidence
listed: source CI, published-image runtime, real-service acceptance and customer
acceptance are separate gates.

| Task                               | Status                                                                                                               | Tested revision / evidence                                                                                                                                                                                                                           | Next action                                                                                                                                                               | Owner                           |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| 1. Establish and maintain baseline | PR #19 CI verified; milestone 1B runtime fixes locally verified, dependent review open                               | PR #19 `7693de8131d9ea11dcff30dbd695219c64a4170d`; [PR #20 actual-head results and artifacts](https://github.com/EdenCirakoglu/Client-Tracker/pull/20), [dependency inventory](DEPENDENCY_REMEDIATION.md), [historical baseline](LAUNCH_BASELINE.md) | Require passing final-head CI; review four residual build-tool risks and open CodeQL classifications. Retarget and recheck CodeQL after prerequisite merge. No merge yet. | Maintainer + repository owner   |
| 2. Buyer-facing workflow           | Existing delivery, scope, summaries and planning merged; onboarding and workflow notifications not implemented       | [PR #16 evidence](FEATURE_RELEASE_VERIFICATION.md), [workflow contract](PRODUCT_WORKFLOWS.md)                                                                                                                                                        | Separate product PR: walk through all three roles; add administrator checklist and permission-rechecked durable workflow notifications, using Mailpit only                | Maintainer                      |
| 3. Release candidate               | Historical CI/publication verified; current pair has registry metadata but no new published-image runtime acceptance | [Release evidence](RELEASE_READINESS.md), [installation guide](INSTALLATION_GUIDE.md)                                                                                                                                                                | Full product CI, approved merge, digest-pinned image verification, populated upgrade/restore and versioned handoff                                                        | Maintainer + repository owner   |
| 4. Real staging                    | Not accepted; fixture tests are not external-service evidence                                                        | [Operator controls](OPERATOR_CONTROLS.md), [deployment guide](DEPLOYMENT.md)                                                                                                                                                                         | Supply operator inputs below privately; approve separated staging and perform actual acceptance                                                                           | Operator                        |
| 5. Purchasable installation offer  | Service information only; no configured booking or checkout                                                          | [Services](SERVICES.md), [commercial options](MONETISATION.md)                                                                                                                                                                                       | Agree scope, effort/cost worksheet, price, terms and capacity; configure genuine destinations and test-mode purchase before approval to activate                          | Repository owner                |
| 6. Controlled agency pilot         | Not started; no customer evidence                                                                                    | [Installation acceptance](INSTALLATION_GUIDE.md)                                                                                                                                                                                                     | Prepare interview/demo/feedback pack, then obtain permission to contact one agency; record usability, support effort and willingness to pay                               | Repository owner + pilot agency |

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
