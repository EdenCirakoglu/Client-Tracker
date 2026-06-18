# ClientOps Tracker

ClientOps Tracker is a full-stack portfolio project for demonstrating backend systems, REST API design, authentication, database persistence, ORM usage, schema design, CI/CD, and cloud-ready deployment practices.

This repository is currently through Phase 3: monorepo foundation, PostgreSQL schema, seed data, and a database-backed Express REST API with JWT authentication, role-based authorization, validation, Swagger docs, and API tests.

## Stack

- Frontend: Next.js, React, TypeScript
- Backend: Express.js, TypeScript
- Database: PostgreSQL
- ORM: Drizzle ORM and Drizzle Kit
- Tooling: pnpm workspaces, ESLint, Prettier, Vitest
- Delivery foundation: Dockerfiles, Docker Compose, GitHub Actions

## Project Structure

```text
clientops-tracker/
  apps/
    api/
      drizzle/
      src/
      tests/
      Dockerfile
      package.json
      .env.example
    web/
      public/
      src/
      Dockerfile
      package.json
      .env.example
  .github/
    workflows/
  docker-compose.yml
  docker-compose.prod.yml
  package.json
  pnpm-workspace.yaml
  README.md
```

## Prerequisites

- Node.js 20+
- pnpm 9+
- Docker Desktop

Enable pnpm through Corepack if needed:

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
```

## Local Development

Install dependencies:

```bash
pnpm install
```

Create local environment files:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

On Windows PowerShell:

```powershell
Copy-Item apps/api/.env.example apps/api/.env
Copy-Item apps/web/.env.example apps/web/.env.local
```

Start PostgreSQL:

```bash
pnpm db:up
```

Run both apps:

```bash
pnpm dev
```

Run apps separately:

```bash
pnpm dev:api
pnpm dev:web
```

Default local URLs:

- Web: http://localhost:3000
- API: http://localhost:8080
- API health: http://localhost:8080/health
- Swagger docs: http://localhost:8080/api/docs

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Database Workflow

Start PostgreSQL:

```bash
pnpm db:up
```

Apply schema migrations and seed local data:

```bash
pnpm db:migrate
pnpm db:seed
```

Open Drizzle Studio:

```bash
pnpm db:studio
```

## API Usage

Seeded demo users:

```text
admin@example.com / password123 / ADMIN
developer@example.com / password123 / DEVELOPER
client@example.com / password123 / CLIENT
```

Log in:

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@example.com\",\"password\":\"password123\"}"
```

Use the returned JWT as a bearer token:

```bash
curl http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer <token>"
```

Primary API routes:

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET|POST /api/clients`
- `GET|PATCH /api/clients/:id`
- `GET|POST /api/projects`
- `GET|PATCH /api/projects/:id`
- `GET|POST /api/tickets`
- `GET|PATCH /api/tickets/:id`
- `POST /api/tickets/:id/triage-suggestion`
- `PATCH /api/tickets/:id/apply-triage-suggestion`
- `GET|POST /api/tickets/:id/comments`
- `GET|POST /api/releases`
- `GET /api/dashboard/metrics`
- `GET /api/docs`

Role behavior:

- `ADMIN` can manage clients, projects, tickets, comments, and releases.
- `DEVELOPER` can view operational data and update tickets.
- `CLIENT` can only access their own client, projects, tickets, and public comments.

## AI-Assisted Ticket Triage

ClientOps Tracker includes an advisory ticket triage workflow. When a ticket is created, the API generates a suggestion with:

- category
- priority
- short internal summary
- suggested next action
- confidence score

Internal users can also refresh a suggestion manually with:

```text
POST /api/tickets/:id/triage-suggestion
```

`ADMIN` and `DEVELOPER` users can apply the latest suggestion with:

```text
PATCH /api/tickets/:id/apply-triage-suggestion
```

Applying a suggestion updates the ticket category and priority, marks the suggestion as accepted, and records a ticket event. Suggestions are advisory only; internal users remain responsible for the final decision.

The current implementation is deterministic and rule-based for transparency and reliability. The triage logic is isolated in `apps/api/src/services/triage.service.ts`, so a future LLM provider can be added behind the same service boundary.

## Files To Edit Locally

- `apps/api/.env`: local backend port, database URL, CORS origin
- `apps/web/.env.local`: local public API URL
- `docker-compose.prod.yml`: production image names and environment wiring before deployment
- `apps/api/src/db/schema.ts`: Drizzle schema definitions
