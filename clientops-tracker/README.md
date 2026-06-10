# ClientOps Tracker

ClientOps Tracker is a full-stack portfolio project for demonstrating backend systems, REST API design, authentication, database persistence, ORM usage, schema design, CI/CD, and cloud-ready deployment practices.

This repository is currently in Phase 1: monorepo foundation only. Product features, authentication flows, and domain schema will be added in later phases.

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

## Quality Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

## Database Workflow

The PostgreSQL container is ready for local development. Domain tables are intentionally not defined yet.

When schema work begins:

```bash
pnpm --filter @clientops/api db:generate
pnpm --filter @clientops/api db:migrate
pnpm --filter @clientops/api db:studio
```

## Files To Edit Locally

- `apps/api/.env`: local backend port, database URL, CORS origin
- `apps/web/.env.local`: local public API URL
- `docker-compose.prod.yml`: production image names and environment wiring before deployment
- `apps/api/src/db/schema.ts`: future Drizzle schema definitions

