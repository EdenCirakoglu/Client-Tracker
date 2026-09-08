# ClientOps Tracker - Project Summary

## What It Is

ClientOps Tracker is an open-source support and delivery operations platform for small software teams. It gives internal teams and clients a shared workflow for projects, tickets, comments, releases, operational metrics, and advisory ticket triage.

## Why It Was Built

The project was built to demonstrate production-minded full-stack engineering through a useful product rather than an isolated technical exercise. It addresses the common gap between client requests, engineering ownership, support history, and delivery visibility.

## Engineering Evidence

- Next.js TypeScript dashboard using the App Router and Tailwind CSS.
- Express TypeScript REST API with route, controller, service, middleware, and validation layers.
- PostgreSQL relational schema implemented with Drizzle ORM and versioned migrations.
- JWT authentication with bcryptjs password verification.
- Role-based and ownership-based authorization for administrators, developers, and clients.
- Zod validation and centralized JSON error handling.
- Swagger/OpenAPI documentation for the API contract.
- Rule-based triage service with persisted suggestions and ticket event history.
- Vitest and Supertest coverage for authentication, authorization, CRUD, metrics, and triage behavior.
- Dockerfiles, Docker Compose, GitHub Actions CI, GHCR publishing, and an optional manual VPS deployment workflow.

## Architecture

The web application calls the Express API with bearer tokens. The API authenticates and authorizes each protected request, validates input, delegates domain operations to services, and persists data through Drizzle ORM in PostgreSQL. The triage service is isolated so a future LLM provider can be introduced without changing route contracts.

## Testing and CI

Local release checks: 34 API tests and four browser scenarios passed, including two-client privacy, persisted triage, ticket update feedback, keyboard navigation and session handling. The full PostgreSQL/API/web/Nginx stack ran locally; content fingerprints verify isolation and persistence after restart. Twenty-one fictional-data screenshots are included in [the screenshot index](docs/SCREENSHOTS.md). These are local results, not a claim of public deployment.

The pnpm workspace provides commands for linting, typechecking, testing, building, formatting, migrations and Compose validation. GitHub-discoverable root workflows check out the exact PR head and run these checks plus real container/browser scenarios. See [revision-specific verification evidence](docs/RELEASE_READINESS.md) for hosted results and [browser reproduction](docs/BROWSER_TESTS.md) for HTML/JSON reports. Tests use a separately designated disposable database, with two-client privacy regression tests and transactional/idempotent triage coverage.

## Deployment Readiness

The repository includes production container definitions, an Nginx public entry point, persistent PostgreSQL storage, and a manual DigitalOcean deployment workflow. Public deployment is not claimed. Local container and browser verification results are recorded separately in the release evidence. A real deployment still requires production secrets, a managed or secured database, HTTPS, domain configuration, backups, monitoring, and a defined release policy.

## Release-Readiness Evidence

The previous public main commit (`611ca061`) contains the placeholder frontend. The newer dashboard and operations documentation were located in the local working tree; this pass preserves that work and history. API regression checks reproduced and fixed client workload disclosure, internal triage disclosure on creation and missing saved triage on detail. Local test execution left the original demo database content fingerprint unchanged.

## Future Improvements

Planned improvements include secure HTTP-only cookie sessions, rate limiting, audit logging, pagination, richer tenant administration, integrations, hosted SaaS capabilities, and an optional provider-backed triage adapter.

## Links

- Repository: https://github.com/EdenCirakoglu/Client-Tracker
- Live demo: _To be added after deployment_
- API documentation: _Local: http://localhost:8080/api/docs_
- Screenshots: [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
