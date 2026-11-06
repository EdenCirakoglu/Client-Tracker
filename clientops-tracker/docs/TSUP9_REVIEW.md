# tsup 9 Compatibility Review

## Current Main-Based Candidate: 2026-11-06

The owner merged PR #20 as `e114a0e64c9736b84db2fdb2d9ed330c650eb136`.
Its exact-main CI, both automatic publishing jobs and isolated digest-pinned
runtime checks passed; see [release evidence](RELEASE_E114A0E.md). Only then was
PR #31 retargeted to `main` and that history merged into this review branch.
Reconciliation was clean; no application, historical migration or dependency
resolution changed. The tsup range remains `^9.0.0`; frozen install passed.

Fresh production audit: exit 0, zero known production npm findings. Full audit:
exit 1, **two moderate findings remain**, neither accepted nor suppressed:

| Advisory                                                                 | Exact affected chain                                                                                                   | Required next action                                                                                                   |
| ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | API > drizzle-kit 0.31.11 > @esbuild-kit/esm-loader 2.6.5 > @esbuild-kit/core-utils 3.3.2 > esbuild 0.18.20            | Maintainer: supported loader replacement; owner: explicit overdue decision, no acceptance inferred from a source merge |
| [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) | Root > typescript-eslint 8.61.0 > typescript-estree 8.61.0 > minimatch 10.2.5, through seven parser/utils/plugin paths | Maintainer: supported parent update to minimatch >=11.0.1; owner review before customer installation                   |

This candidate removes **GHSA-g7r4-m6w7-qqqr** from tsup and bundle-require by
selecting esbuild 0.28.2 (patched >=0.28.1). Production audit does not cover
development tools, OS packages, application logic, CodeQL or deployment settings.
Retain restrictions/proposed decisions in [RELEASE_INTEGRATION.md](RELEASE_INTEGRATION.md).
Fresh CI and CodeQL analysis **and policy** results for the final pushed head
are linked in the PR handoff, not substituted by historical October success.
This PR stays open/unmerged, with no auto-merge and no public deployment.

## Historical Stacked Review: 2026-10-28

PR #31 is prepared separately from PR #20 and PR #22. The existing Dependabot
commit is retained, with the refreshed maintenance baseline merged into its
review branch. Its intended review base is PR #20, then main after an approved
maintenance merge. Never merge the tooling PR into maintenance as a release.
No merge or image publication is authorized in this preparation.

## Dependency Scope

The only additional manifest change is `tsup: ^8.3.5` to `^9.0.0`. The final
lockfile retains Zod 4.6.7, body-parser 1.20.9, ip-address 10.7.5, selector-parser
6.1.5 and Vitest 4.1.12 from maintenance. It does not take an older lockfile.
An initial pnpm conflict repair rejected duplicate YAML keys and attempted a
broad resolution; that generated result was not retained. A structured three-way
merge preserved maintenance resolutions and the tsup 9 importer, followed by
`pnpm install --lockfile-only --fix-lockfile` and a fresh frozen installation.
No other direct dependency was upgraded.

[tsup 9 release notes](https://github.com/egoist/tsup/releases/tag/v9.0.0) require
Node >=22.18 and update esbuild/chokidar plus the diagnostic logger. The repository
already pins Node 24. The resolved esbuild 0.28.2, including bundle-require's peer,
removes [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr)
from this candidate. Supporting changes are confined to tsup's dependency chain:
chokidar/readdirp, cac, obug, rollup, source maps, tinyexec and loader helpers.

Production audit reports zero known npm advisories. Full audit still exits 1
for the Kit legacy-loader esbuild 0.18.20 path:
[GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
Its disposition remains proposed, not accepted, due November 4 or first customer
installation. #20 and #22 still retain both findings until this separate change
is reconciled and approved. Do not relabel their audit results as this result.

## Executable and Runtime Gates

`node scripts/check-packaged-api.mjs` requires an explicitly named disposable
test database. It checks all ten generated executables, runs the packaged
migration and fingerprint commands against populated records, and proves the
seed executable refuses missing reset acknowledgement without changing records.

| Executable         | Additional retained runtime coverage                                              |
| ------------------ | --------------------------------------------------------------------------------- |
| server             | Container readiness, browser sessions, requests, decisions and outages            |
| migrate            | Populated upgrade, idempotent migration, restore and deployment failures          |
| seed               | Explicit rejection with SEED_RESET=false; no existing database is reseeded        |
| fingerprint        | Real read-only business-table fingerprint before/after migration and refused seed |
| bootstrap          | Isolated account bootstrap and invitation browser suite                           |
| mail-worker        | Separate worker startup, SMTP outage, retry, concurrent workers and restart       |
| restore-sanitize   | Restore invalidates sessions and account links while retaining business data      |
| maintenance        | Bounded operational-retention fixture                                             |
| provision-roles    | Explicit privileged conversion/install fixture                                    |
| check-runtime-role | Restricted runtime grants and append-only event checks                            |

Run the existing full CI suite at the actual new head, including both application
image builds, operator image, all container workflows, browser/accessibility and
CodeQL analyses. The final PR handoff records exact results and artifact links;
the older Dependabot CI is not evidence for this refreshed combination.
No historical migration or application behavior is deliberately changed.
