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

The [release-candidate handoff](docs/RELEASE_CANDIDATE.md) adds one deployment
sequence for manual/SSH updates, explicit role conversion, verified backups,
failure recovery and certificate-hook acceptance. External-service and
screen-reader sign-off remain separate from automated checks.

The [follow-up PR #5](https://github.com/EdenCirakoglu/Client-Tracker/pull/5)
initially passed [hosted CI at `cf6d0f4`](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34858027875):
75 API tests, 10 verification-helper tests and 10 browser/accessibility scenarios,
plus native 200% zoom, restricted database roles, DB/SMTP outages, encrypted backup
failure detection, populated restore and pinned legacy rollback. Its [evidence](docs/FOLLOWUP_READINESS.md)
and [screenshots](docs/SCREENSHOTS.md) distinguish local operator fixtures from external
services still awaiting configuration. The PR remains unmerged; its images have not
been published. The published `7eba339` pair was separately verified without rebuilding.
Later deployment/certificate corrections and 21 helper regressions are documented
in the release-candidate handoff. The PR records the final tested head and its own
CI, rather than relabelling historical successful or failed runs.

The merged [session hardening PR #3](https://github.com/EdenCirakoglu/Client-Tracker/pull/3)
has [verified main CI at `bdc7494`](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34767427740):
60 API/configuration tests and nine real browser/accessibility scenarios, including
HTTPS cookies, Mailpit invitation/recovery, role queues, URL filters, both themes
and a populated database upgrade without reseeding. Earlier results at `2341e61`
remain revision-specific in the release evidence.
Both published images were additionally pulled and tested locally without rebuilding: nine browser scenarios, organisation isolation, logout replay rejection and persistence passed. [Release evidence](docs/RELEASE_BDC749.md) separates hosted CI, publication and local verification. Neither production email nor public deployment is claimed.

The merged release revision `3fa8d7f` passed hosted CI with 37 API tests and four browser/accessibility scenarios. Both GHCR images were published for that exact SHA, pulled locally without rebuilding, and passed all four browser scenarios again. Database fingerprints verified persistence after full container recreation and preservation of existing databases. See [published-image evidence](docs/REGISTRY_VERIFICATION.md) for exact revisions, digests and reports. Twenty-one fictional-data screenshots are included in [the screenshot index](docs/SCREENSHOTS.md). Public deployment has not been performed.

The pnpm workspace provides commands for linting, typechecking, testing, building, formatting, migrations and Compose validation. GitHub-discoverable root workflows check out the exact PR head and run these checks plus real container/browser scenarios. See [revision-specific verification evidence](docs/RELEASE_READINESS.md) for hosted results and [current browser reproduction](docs/SESSION_HARDENING.md#isolated-https-browser-verification) for HTML/JSON reports. Tests use a separately designated disposable database, with two-client privacy regression tests and transactional/idempotent triage coverage.

## Deployment Readiness

The repository includes production container definitions, an Nginx public entry point, persistent PostgreSQL storage, and a manual DigitalOcean deployment workflow. Public deployment is not claimed. Local container and browser verification results are recorded separately in the release evidence. A real deployment still requires production secrets, a managed or secured database, HTTPS, domain configuration, backups, monitoring, and a defined release policy.

## Release-Readiness Evidence

The older main commit (`611ca061`) contained the placeholder frontend. PR #1 preserved the newer local implementation in checkpoint history and was merged with a normal merge commit after verified CI. API regressions cover client workload/privacy, saved triage, rollback of ticket/comment changes when history writes fail, and concurrent update history. Existing demonstration databases remained unchanged during verification.

## Future Improvements

Cookie sessions, recovery, invitations and PostgreSQL-backed authentication rate limits were merged in `bdc7494`. Its [UI refinement](docs/UI_REFINEMENT.md) adds role-specific work queues, database-backed pagination, exact metric links, private activity and consistent accessible themes. The subsequent operations work is now merged and published as [`7eba339`](docs/RELEASE_7EBA339.md): readiness, encrypted durable email, restore/rollback rehearsal and privacy safeguards. That exact published pair passed separate local verification. The new [operator-controls and usability follow-up](docs/OPERATOR_CONTROLS.md) remains under review. Trusted external TLS, SMTP, off-host storage and actual alert delivery still require operator acceptance. MFA, pagination of remaining legacy collections, integrations and an optional provider-backed triage adapter remain future improvements.

## Links

- Repository: https://github.com/EdenCirakoglu/Client-Tracker
- Live demo: _To be added after deployment_
- API documentation: _Local: http://localhost:8080/api/docs_
- Screenshots: [docs/SCREENSHOTS.md](docs/SCREENSHOTS.md)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- Deployment: [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
