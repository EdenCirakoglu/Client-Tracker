# ClientOps Tracker

[![CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/workflows/ci.yml/badge.svg)](https://github.com/EdenCirakoglu/Client-Tracker/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](clientops-tracker/LICENSE)

Open-source support and delivery operations platform for small software teams.

Manage client projects, support tickets, comments, releases, and advisory rule-based triage through a role-aware Next.js dashboard and an Express REST API backed by PostgreSQL and Drizzle.

![ClientOps Tracker administrator dashboard using fictional demo data](clientops-tracker/docs/assets/screenshots/ui/after/ui-admin-dashboard.png)

- [Project guide and local setup](clientops-tracker/README.md)
- [Engineering summary](clientops-tracker/PROJECT_SUMMARY.md)
- [Architecture](clientops-tracker/docs/ARCHITECTURE.md)
- [API reference](clientops-tracker/docs/API.md)
- [Secure sessions and account setup](clientops-tracker/docs/SESSION_HARDENING.md)
- [Role-based operations UI and verification](clientops-tracker/docs/UI_REFINEMENT.md)
- [Deployment guide](clientops-tracker/docs/DEPLOYMENT.md)
- [Release verification evidence](clientops-tracker/docs/RELEASE_READINESS.md)
- [Screenshots](clientops-tracker/docs/SCREENSHOTS.md)
- [Contributing](clientops-tracker/CONTRIBUTING.md) and [security policy](clientops-tracker/SECURITY.md)

## Repository Layout

```text
.github/workflows/       # GitHub-discoverable CI, image publication and manual deployment
clientops-tracker/       # pnpm workspace; run application commands here
  apps/web/             # Next.js App Router / TypeScript
  apps/api/             # Express / Drizzle / PostgreSQL / Vitest
  docs/                 # Architecture, operations and verification evidence
```

```powershell
git clone https://github.com/EdenCirakoglu/Client-Tracker.git
cd Client-Tracker/clientops-tracker
pnpm install --frozen-lockfile
```

Continue with the [local setup](clientops-tracker/README.md). Public hosting is a separate step: this repository does not claim a live deployment or a passing hosted workflow without an actual run.
