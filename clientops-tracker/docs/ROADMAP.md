# Roadmap

The roadmap keeps future work focused on operational value, production safety, and a viable hosted product.

## MVP Polish

- Add richer ticket filtering, pagination, and saved views.
- Show ticket event history and persisted triage suggestions in the UI.
- Improve related-user display names and project/client summaries in API responses.
- Add frontend component and workflow tests.
- Add accessible keyboard and screen-reader refinements.

## Production Hardening

- Replace localStorage JWTs with secure HTTP-only cookie sessions.
- Add rate limiting, audit log retention, structured logging, and request correlation IDs.
- Add automated dependency scanning, backups, restore drills, and health monitoring.
- Add production migration packaging and a defined rollback strategy.
- Add pagination and database query performance monitoring.

## SaaS Features

- Tenant-aware organisation administration.
- Invitations, password reset, profile management, and notification preferences.
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
