# ClientOps Tracker - Project Summary

## What It Is

ClientOps Tracker is an open-source support and delivery operations platform for small software teams. It gives internal teams and clients a shared workflow for projects, tickets, comments, releases, operational metrics, and advisory ticket triage.

## Why It Was Built

The project was built to demonstrate production-minded full-stack engineering through a useful product rather than an isolated technical exercise. It addresses the common gap between client requests, engineering ownership, support history, and delivery visibility.

## Engineering Evidence

- Next.js TypeScript dashboard using the App Router and Tailwind CSS.
- Express TypeScript REST API with route, controller, service, middleware, and validation layers.
- PostgreSQL relational schema implemented with Drizzle ORM and versioned migrations.
- PostgreSQL-backed revocable sessions, HttpOnly/Secure cookies, CSRF protection and bcryptjs password verification.
- Role-based and ownership-based authorization for administrators, developers, and clients.
- Zod validation and centralized JSON error handling.
- Swagger/OpenAPI documentation for the API contract.
- Rule-based triage service with persisted suggestions and ticket event history.
- Vitest and Supertest coverage for authentication, authorization, CRUD, metrics, and triage behavior.
- Dockerfiles, Docker Compose, GitHub Actions CI, GHCR publishing, and an optional manual VPS deployment workflow.

## Architecture

The web application calls Express with cookie sessions and synchronizer CSRF tokens. The API enforces idle/absolute expiry, revocation, current roles and organisation ownership, validates input, delegates domain operations to services, and persists through Drizzle/PostgreSQL. Controlled bootstrap, administrator invitations and single-use password recovery provide non-demo account setup. The triage provider boundary remains deterministic and unchanged.

## Testing and CI

The unmerged [session hardening PR #3](https://github.com/EdenCirakoglu/Client-Tracker/pull/3)
has [verified CI at `4614642`](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34612080774):
60 API/configuration tests and nine real browser/accessibility scenarios, including
HTTPS cookies, Mailpit invitation/recovery, role queues, URL filters, both themes
and a populated database upgrade without reseeding. Earlier results at `2341e61`
remain revision-specific in the release evidence.
These are runner/local verification results, not a production email service or
public deployment. Exact revisions and reports are in the release evidence below.

The merged release revision `3fa8d7f` passed hosted CI with 37 API tests and four browser/accessibility scenarios. Both GHCR images were published for that exact SHA, pulled locally without rebuilding, and passed all four browser scenarios again. Database fingerprints verified persistence after full container recreation and preservation of existing databases. See [published-image evidence](docs/REGISTRY_VERIFICATION.md) for exact revisions, digests and reports. Twenty-one fictional-data screenshots are included in [the screenshot index](docs/SCREENSHOTS.md). Public deployment has not been performed.

The pnpm workspace provides commands for linting, typechecking, testing, building, formatting, migrations and Compose validation. GitHub-discoverable root workflows check out the exact PR head and run these checks plus real container/browser scenarios. See [revision-specific verification evidence](docs/RELEASE_READINESS.md) for hosted results and [current browser reproduction](docs/SESSION_HARDENING.md#isolated-https-browser-verification) for HTML/JSON reports. Tests use a separately designated disposable database, with two-client privacy regression tests and transactional/idempotent triage coverage.

## Deployment Readiness

The repository includes production container definitions, an Nginx public entry point, persistent PostgreSQL storage, and a manual DigitalOcean deployment workflow. Public deployment is not claimed. Local container and browser verification results are recorded separately in the release evidence. A real deployment still requires production secrets, a managed or secured database, HTTPS, domain configuration, backups, monitoring, and a defined release policy.

## Release-Readiness Evidence

The older main commit (`611ca061`) contained the placeholder frontend. PR #1 preserved the newer local implementation in checkpoint history and was merged with a normal merge commit after verified CI. API regressions cover client workload/privacy, saved triage, rollback of ticket/comment changes when history writes fail, and concurrent update history. Existing demonstration databases remained unchanged during verification.

## Future Improvements

Cookie sessions, recovery, invitations and PostgreSQL-backed authentication rate limits are implemented in the hardening branch. Its [UI refinement](docs/UI_REFINEMENT.md) adds role-specific work queues, database-backed pagination, exact metric links, private activity and consistent accessible themes. The expanded suite retains earlier coverage and adds dashboard behavior: 60 API/configuration tests and nine browser scenarios, with revision-specific results in the release evidence. The next milestone covers backup/restore drills, monitoring, real TLS/secrets/SMTP configuration, security-event audit retention and durable email delivery. MFA, pagination of remaining legacy collections, integrations and an optional provider-backed triage adapter remain future improvements. See [session hardening](docs/SESSION_HARDENING.md) for design and local verification, distinct from public deployment.

## Links

- Repository: https://github.com/EdenCirakoglu/Client-Tracker
- Live demo: _To be added after deployment_
- API documentation: _Local: http://localhost:8080/api/docs_
- Screenshots: [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
