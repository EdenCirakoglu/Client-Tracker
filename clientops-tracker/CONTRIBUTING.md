# Contributing to ClientOps Tracker

Thank you for taking the time to contribute. ClientOps Tracker is an open-source support and delivery operations platform for small software teams.

## Before You Start

Read the [Code of Conduct](CODE_OF_CONDUCT.md) and [Security Policy](SECURITY.md). Do not include credentials, personal data, customer data, or production configuration in an issue or pull request.

## Local Setup

Requirements:

- Node.js 24 LTS
- pnpm 9.15.4
- Docker Desktop

From the repository root:

```bash
cd clientops-tracker
pnpm install --frozen-lockfile
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm db:up
pnpm db:migrate
SEED_RESET=true pnpm db:seed
pnpm dev
```

On Windows PowerShell, use `Copy-Item` instead of `cp` for environment files. The web app runs at `http://localhost:3000` and the API at `http://localhost:8080`.

In PowerShell set `$env:SEED_RESET='true'` for the seed command, then remove it with
`Remove-Item Env:SEED_RESET`. Existing env files must be reviewed, not overwritten.
The default demo DB is `clientops_demo`; the previous `clientops_tracker` DB is
preserved. Never seed production. See [the setup guide](README.md).

## Development Workflow

1. Create a focused branch from `main`.
2. Make the smallest change that solves the problem.
3. Add or update tests for behavior changes.
4. Update documentation when commands, API behavior, or configuration changes.
5. Run the quality checks before opening a pull request.

```bash
pnpm db:test:up
cp apps/api/.env.test.example apps/api/.env.test
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format:check
```

Tests require `TEST_DATABASE_URL` and an exact `DISPOSABLE_DATABASE_NAME`; they do
not fall back to `.env`. Browser checks use the isolated local stack from
[DEPLOYMENT.md](docs/DEPLOYMENT.md), with `E2E_ALLOW_DISPOSABLE_DEMO=true`.
Do not point these mutating checks at a hosted environment.

## Pull Requests

Pull requests should explain the problem, the implementation, and how the change was verified. Include screenshots for user-facing changes and note any database migration or environment-variable changes.

Keep commits and pull requests scoped. Unrelated formatting or dependency changes should be submitted separately.

## Issues

Use the bug report and feature request templates. For security vulnerabilities, follow [SECURITY.md](SECURITY.md) instead of opening a public issue.
