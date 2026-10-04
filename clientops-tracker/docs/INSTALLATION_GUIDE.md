# ClientOps Installation and Acceptance Guide

For this feature increment's actual checks and pending release gates, see
[feature-release verification](FEATURE_RELEASE_VERIFICATION.md). A passing local
fixture does not establish acceptance of a customer's production services.

For teams evaluating self-hosting or assisted installation. The public code remains MIT
licensed; optional paid installation is a service, not exclusive access to the repository.
[Booking and checkout are not yet configured](SERVICES.md). Do not send payment or private
credentials through GitHub issues.

## Agree Before Installation

- Name an organisation owner, administrator, delivery owner and recovery operator.
- Define which client contacts may review outcomes and approve scope. These are explicit
  per-revision assignments, not permission for every client contact to approve everything.
- Record the work included: host configuration, domain, branding, account onboarding and
  agreed acceptance tests. Scope migrations/integrations and ongoing support separately.
- Choose private staging first. Public demo credentials are for disposable local data only.
- Confirm expected usage, maintenance responsibility, support window, recovery-time and
  data-loss targets. The repository does not supply a hosting/support SLA.

## Operator Inputs (Private)

Domain/DNS control, host access, independent production secrets, trusted TLS, authenticated
SMTP and a verified sender, encrypted off-host backup storage, key escrow, operator alert
destination, external monitoring and security-log retention policy. Store these outside Git.

The application does not create paid resources, establish a payment provider, issue trusted
certificates or configure real mail delivery automatically.

## Installation and Upgrade Path

1. Select a reviewed source revision and its **verified published** API/web image digests.
   Local uncommitted delivery-planning work is not a published release. Do not assume a
   `latest` tag contains it or reuse earlier release evidence for a later revision.
2. Follow [OPERATOR_CONTROLS.md](OPERATOR_CONTROLS.md) for the executable prepare/apply
   sequence. Its `install`, `convert` and `update` modes have different prerequisites.
   Provision privileged database roles explicitly; runtime credentials are not migrator credentials.
3. For updates, quiesce writers, take and verify the encrypted backup, migrate, reconcile
   runtime grants, start and test readiness. Never seed an existing installation.
4. Bootstrap the first administrator only on a new installation, then invite named users.
   Review mail delivery status and confirm actual receipt with authorised test recipients.
5. Run the acceptance checks below and retain revision-specific evidence. Rehearse recovery
   with pinned compatible images; no arbitrary schema downgrade or automatic rollback.

The detailed [deployment runbook](DEPLOYMENT.md), [release handoff](RELEASE_CANDIDATE.md)
and [security model](SECURITY.md) are the source of operational commands. This guide does
not replace those procedures with a less safe one-click script.

## Customer Handoff Checklist

- Trusted HTTPS, renewal/reload, readiness and failure alerts accepted against real services.
- Invitations and recovery arrive; logout/reset revoke sessions; no demo shortcuts in production.
- Two separate client organisations cannot read each other's tickets, comments, plans or summaries.
- A real request progresses through criteria agreement, release delivery and client acceptance.
- A scope revision requires its named approver; edits require fresh approval.
- Staff preview a summary, then publish it to the correct client portal. No summary email is claimed.
- Keyboard and screen-reader acceptance completed by named reviewers; mobile controls usable.
- Scheduled backup restored on a separate recovery host, with measured timing and a named recovery owner.
- Operator receives a deliberate failure alert and external monitoring detects a missing host/heartbeat.
- Deliver an inventory: source SHA, API/web digests, operator image revision, migration journal,
  private configuration locations, backup/restore evidence and support responsibilities. Exclude secrets.

Local fixture results demonstrate engineering checks, not acceptance of a real SMTP provider,
off-host bucket, public certificate, commercial support agreement or production deployment.
