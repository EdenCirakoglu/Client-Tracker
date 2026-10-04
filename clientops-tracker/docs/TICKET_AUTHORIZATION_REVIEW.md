# Ticket Mutation Review

Reviewed on 2026-10-04 from main `6b3b0c2980437241988d8b556e843f2b791a2f62`,
after PR #16 merged as `8c914c577a82e4481712103abd0b8e38753185ff` and the Morgan
update merged separately. The worktree was clean. Prior feature-release results
remain attached to their original revisions; they do not verify this follow-up.

## Findings and Changes

| Reported finding                   | Reproduction and resolution                                                                                                                                                                                                                                                                                           |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Test database unavailable          | Reproduced `ECONNREFUSED` on 55433. The ignored local test file used the older fixture. Aligned it with `.env.test.example` and started `pnpm db:test:up` (PostgreSQL 55434 plus Mailpit). Global setup now bounds connection checks and explains the required configuration without falling back to a demo database. |
| Workflow-boundaries formatting     | Not reproduced at current main: the file and full formatting check passed. No unrelated formatting rewrite.                                                                                                                                                                                                           |
| Ticket-update authorization race   | Reproduced stale-account writes. Revalidate active account, role and organisation inside the transaction, lock the ticket and project scope, enforce staff-only writes in the service, and lock/recheck assignee eligibility.                                                                                         |
| Comment and related mutation races | Apply the same guard to public/internal comments, creation and triage generation/application. Existing delivery/scope writes share the strengthened project lock. Rejected writes cannot leave comments, suggestions or history events.                                                                               |
| Inconsistent update timestamps     | Central Drizzle `$onUpdate` fallback covers all six mutable business tables. Explicit import/fixture timestamps remain valid. This is an ORM policy, not a raw-SQL trigger; operator SQL must set timestamps explicitly. No migration or history backfill.                                                            |
| Build lint bypass                  | Removed `ignoreDuringBuilds`. Made the shared Next plugin registration and project directory work from both workspace and web build directories. A temporary `debugger` probe failed the production build with `no-debugger`; removed the probe and the clean build passed without the previous plugin/path warnings. |

## Regression Evidence

Before service fixes, **18/18 authorization regressions failed** because stale
contexts were permitted. Afterward, **24/24 focused tests passed**: 22 mutation
tests and two timestamp tests. Concurrent tests observe PostgreSQL blocking PIDs
before committing disablement or project transfer; they do not assume scheduling
from arbitrary sleeps. They assert rejection and unchanged ticket/comment/event/
suggestion records. Existing atomic/idempotent triage and tenant tests remain.

Local frozen installation, lint, typecheck, formatting, both builds and all 26
verification-helper tests passed. The frozen installation required Node's system
CA support on this machine; TLS verification was not disabled. Full-suite,
browser/container and final revision results are recorded on the follow-up PR
and its CI run, not inferred from older runs. No dependencies or lockfile changed
in this follow-up.

## Reproduce

From `clientops-tracker/`, use Node 24, pnpm 9.15.4 and running Docker Linux
containers. Create `apps/api/.env.test` from its example only when absent; update
stale settings individually. Existing demo and verification databases are not
test fixtures and must not be reset.

```powershell
pnpm install --frozen-lockfile
pnpm db:test:up
pnpm --filter @clientops/api exec vitest run tests/ticket-mutation-authorization.test.ts tests/timestamps.test.ts
pnpm test
pnpm test:verification
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
```

The standard suite explicitly resets only `clientops_hardening_test`. Custom
Compose port overrides must match the test URL and Mailpit/SMTP settings in the
test environment. `.env.test` remains ignored and is not committed.

Approval permits normal merge after passing CI and branch synchronization, with
the configured automatic main image publication. It does not authorize public
deployment or real-recipient email. CodeQL scanning remains enabled; the existing
alert #1 has not been dismissed by this follow-up. Real screen-reader and external
production-service acceptance remain separate work.
