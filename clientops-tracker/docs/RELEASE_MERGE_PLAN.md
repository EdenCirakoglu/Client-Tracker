# Controlled Release Preparation

Reviewed October 28, 2026. This is a preparation record, not merge approval.
No PR may be bulk-merged. No PR closure, alert dismissal, publication, real email,
checkout activation or public deployment is performed by this increment.

## Source and Evidence Boundaries

- Main: `38b6ef17f2a2399c5d444da153081167e2b9feae`. The sole change since
  `70246650a1ef80096fe74b08213d62d19323e787` is root Dependabot configuration.
- Maintenance: `release/launch-dependency-remediation-2026-10-21`, PR #20,
  originally `27c7dbb35a7fa855a87ad7ae05ef5034a663c4ec`. Current main is merged
  into this review branch without rewriting history or merging the PR.
- Product: `feature/agency-onboarding-notifications`, PR #22, originally
  `2834effd8ec5890506dc707356bcbe467c9ad2d4`, still based on maintenance.
  Its [verified handoff](https://github.com/EdenCirakoglu/Client-Tracker/pull/22#issuecomment-6469426601)
  and [CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40688079673)
  remain evidence for that revision: 190 API, 28 helper and 14 browser tests.
  The independent external review checked the artifact checksum and four
  screenshots, not every changed line or the laptop application.
- Final source SHAs, checks, artifact checksums and file permalinks are recorded
  in the revision-labelled PR handoff after checks finish, avoiding a document
  that claims to contain its own future commit hash.

## Individual PR Dispositions

All rows are recommendations only. Exact heads are the pre-refresh snapshot;
the final handoff identifies any subsequently updated heads explicitly.

| PR                                                            | Head                                       | Base               | Actual checks at inspection                                                                                                                                                                       | Overlap / recommendation                                                                                                                                                                                     |
| ------------------------------------------------------------- | ------------------------------------------ | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [14](https://github.com/EdenCirakoglu/Client-Tracker/pull/14) | `f89d51bad8681d78b4d91f8999f294d12d40aaf7` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/37227347775), [both CodeQL analyses passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/37227345333)    | Nodemailer 10.0.9 is older than main's ^10.1.7. Recommend authorized closure without merge; do not downgrade.                                                                                                |
| [20](https://github.com/EdenCirakoglu/Client-Tracker/pull/20) | `27c7dbb35a7fa855a87ad7ae05ef5034a663c4ec` | main               | October 21 [CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39624281623) / [CodeQL](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39623982321) passed, historical | Refresh scoped security fixes and obtain fresh checks before approval. Keep Drizzle Kit and wrapped-error compatibility changes.                                                                             |
| [21](https://github.com/EdenCirakoglu/Client-Tracker/pull/21) | `e3a7c5a6acb4b20e54507ced7f3c21fabfcdef85` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39621818138); CodeQL neutral, two missing configurations                                                                 | Vite 7.3.7 is in #20. Recommend closure only after replacement actually merges and owner authorizes closure.                                                                                                 |
| [22](https://github.com/EdenCirakoglu/Client-Tracker/pull/22) | `2834effd8ec5890506dc707356bcbe467c9ad2d4` | maintenance branch | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40688079673); no product-head CodeQL analysis at inspection                                                              | Preserve complete product work. Never merge into maintenance when releasing to main. Retarget only after #20 merges.                                                                                         |
| [23](https://github.com/EdenCirakoglu/Client-Tracker/pull/23) | `92535ce8e9829003cfd4a045916e1fec33e722d3` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686375994); CodeQL neutral                                                                                             | Vite 8.3.5: defer coordinated Vite/Vitest tooling upgrade, not this release.                                                                                                                                 |
| [24](https://github.com/EdenCirakoglu/Client-Tracker/pull/24) | `68e2d648665950f8b9aa68a4ca9e7382c26c705b` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686406399); CodeQL neutral                                                                                             | TypeScript ESLint 8.72: refresh against resulting main, review new lint behavior and combined compatibility separately.                                                                                      |
| [25](https://github.com/EdenCirakoglu/Client-Tracker/pull/25) | `ac7b02e415231c5eb090d8437d0294b409ccf71e` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686441200); CodeQL neutral                                                                                             | ESLint JS 9.39.5: refresh and recheck with the actual ESLint/plugin pair; no independent green-run substitution.                                                                                             |
| [26](https://github.com/EdenCirakoglu/Client-Tracker/pull/26) | `3653a7ea73bace5666436f69d030b79236368479` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686472515); CodeQL neutral                                                                                             | tsx 4.23.15: refresh separately, verify development and migration/bootstrap CLI invocation.                                                                                                                  |
| [27](https://github.com/EdenCirakoglu/Client-Tracker/pull/27) | `4a1efd8ac65b0828a72ddf99729bda19c9b7fdf1` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686498161); CodeQL neutral                                                                                             | Helmet 8.3: refresh separately; verify headers, CSP and Swagger behavior.                                                                                                                                    |
| [28](https://github.com/EdenCirakoglu/Client-Tracker/pull/28) | `a4bbf764021360a29aec492b67b98acf9852ff1c` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686530536); CodeQL neutral                                                                                             | Vitest 5.0.5: defer with #23; individual success does not verify the combined product candidate.                                                                                                             |
| [29](https://github.com/EdenCirakoglu/Client-Tracker/pull/29) | `566cb91cdcd77176653528b5ed6293672b32b7ea` | main               | [Typecheck failed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686571364); CodeQL neutral                                                                                      | Express 5 route-parameter types require a deliberate controller/validation migration. Do not merge as a patch update.                                                                                        |
| [30](https://github.com/EdenCirakoglu/Client-Tracker/pull/30) | `4d219cec704ed950a9041b79dcda76a928af1f24` | main               | [Build failed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686620266); CodeQL neutral                                                                                          | React 19.2.7 / React DOM 19.3.1 mismatch. Align supported React, DOM and type packages before reconsideration.                                                                                               |
| [31](https://github.com/EdenCirakoglu/Client-Tracker/pull/31) | `0a788ba4ad0e090acf3a9aa9ec8e59edde9577a6` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686648139); CodeQL neutral                                                                                             | Prioritize separately reviewed tsup 9 after refreshed maintenance. Its supported esbuild range may remove one finding; verify packaged executables and full container workflows before claiming that result. |
| [32](https://github.com/EdenCirakoglu/Client-Tracker/pull/32) | `56697e3257913f09cfa8d7f39dbeaf9e0cf686ba` | main               | [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40686690283); CodeQL neutral                                                                                             | ORM 0.45.4 alone duplicates #20. Preserve #20's Kit update and wrapped-error fix. Recommend authorized closure only after replacement merges.                                                                |

The live base branch main is `38b6ef1`; historical PR base payloads for #14 and
#21 still name `bc7eeaf` and `7024665`. Review diffs against the current target,
not those stale payload values. Neutral checks for #21 and #23-32 say exactly
"2 configurations not found" (Actions and JavaScript/TypeScript).

## CodeQL Coverage

Default setup remains enabled with both languages and its existing query suite.
The missing-config summary is not analysis success. GitHub default setup scans
PRs targeting default/protected branches; PR #22's maintenance base was not
protected. A direct dispatch attempt returned 422 because the managed workflow
has no workflow_dispatch trigger. With owner approval, protection against force
pushes and deletion was added to that maintenance branch only, including admins.
No main protection, query, alert disposition or workflow permission was weakened.
Fresh product/maintenance pushes must produce both actual analysis records.

Dependabot-only updates showed neutral checks without corresponding analyses.
Their checks must be refreshed on a reviewed candidate and verified by analysis
records, not green check counts. Do not change to advanced setup casually: default
setup blocks advanced CodeQL uploads. See [GitHub setup behavior](https://docs.github.com/en/code-security/concepts/code-scanning/setup-types)
and [default setup configuration](https://docs.github.com/en/code-security/how-tos/find-and-fix-code-vulnerabilities/configure-code-scanning/configure-code-scanning).

Existing CSRF and non-production-cookie classifications remain open, not
dismissed. Middleware order, unsafe-method Origin/CSRF enforcement and production
Secure/HttpOnly/SameSite cookies retain their regression coverage. Passing tests
or a production npm audit do not dispose of a CodeQL finding.

## Tooling Decisions

See [exact esbuild paths and controls](DEPENDENCY_REMEDIATION.md). Both owner
decisions remain **proposed and unapproved**, due November 4, 2026 or first
customer installation, whichever occurs first. The maintainer owns remediation;
the repository owner must approve any bounded acceptance with expiry/controls.

- Kit 0.31.11 -> esm-loader 2.6.5 -> core-utils 3.3.2 -> esbuild 0.18.20:
  CLI generation/Studio tooling; no application serve invocation. Patched esbuild
  > =0.25.0 is outside the legacy loader range. Do not force an unsupported override.
- tsup 8.5.1 -> esbuild 0.27.7, also through bundle-require 5.1.0:
  trusted builds, not the affected Windows development-server invocation.
  [tsup 9](https://github.com/egoist/tsup/releases/tag/v9.0.0) supports esbuild
  ^0.28.2 and requires Node >=22.18 (the repository uses Node 24). Prioritize #31
  as its own compatibility review. An available supported fix is not yet a
  verified fix in #20's lockfile.

Neither is a known application request path, but the release must not describe
them as fixed or accepted. Keep the full audit visible. Before customer install,
resolve them or obtain an explicit owner decision; neither silence nor tests
provide acceptance. OS-package and external-service security remain separate.

## Controlled Merge and Recovery Order

1. Review refreshed #20 actual-head CI, both CodeQL analyses and tooling decisions.
   Request separate merge approval that explicitly includes automatic API/web
   GHCR publication after successful push CI on main. Do not request deployment.
2. After approved #20 merge, record resulting main SHA, main CI and both publishing
   jobs for that exact SHA. Pull digest-pinned images without rebuilding and run
   isolated startup, migration, parser/account, outage and persistence checks.
3. Retarget #22 to main, inspect the incremental diff and reconcile duplicate
   Zod/security changes. Regenerate the lockfile; do not take an old lockfile
   wholesale. Retain both maintenance schema tests and product recipient tests.
   Obtain fresh CI and both CodeQL analyses at its actual final head/base.
4. Request #22's separate merge/publication approval. Never merge #22 into the
   maintenance branch. Verify resulting main images by digest independently.
5. Refresh #31 as a separate priority tooling candidate; then #24-27 individually.
   Close superseded #14/#21/#32 only with authorization and a merged replacement.
   Defer #23/#28, #29 and #30 as described above.

Maintenance adds no schema changes. Product migration 0007 adds workflow mail
and related records. Stop/drain incompatible account-only writers/workers before
applying it, then start the compatible API/worker pair. An older worker cannot
decode new WORKFLOW payloads. Recovery is a verified schema-compatible pair or
repair-forward, not arbitrary old-image selection. Keep privileged provisioning,
verified backup and migration separate from restricted runtime credentials.

## Verification and Remaining Acceptance

The local refresh passed 174 API tests, 26 existing helper tests, lint, typecheck,
both builds, formatting and unchanged migration generation. Two additional
helper regressions cover a reproduced scanner defect: a linked Windows worktree
was not resolvable inside the scanner container, yet Gitleaks exited zero after
scanning zero commits. The wrapper now mounts shared Git metadata read-only,
scans all refs plus HEAD, and fails on errors, missing summary or zero commits.
No fixture exception was broadened. The final hosted run must verify the same
wrapper in a fresh normal checkout and retain all previous operational checks.

The final PR handoff lists commands actually run and their outcomes. Locally use
Node 24, pnpm 9.15.4, Docker and a separately named disposable cluster:

```powershell
cd clientops-tracker
$env:TEST_PG_PORT='15437'
$env:TEST_SMTP_PORT='11029'
$env:TEST_MAIL_PORT='18029'
docker compose -p clientops-release-review-tests-20261028 -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@127.0.0.1:15437/clientops_hardening_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_hardening_test'
$env:SMTP_PORT='11029'
$env:MAILPIT_URL='http://127.0.0.1:18029'
pnpm install --frozen-lockfile
pnpm audit --prod
pnpm audit
pnpm lint
pnpm typecheck
pnpm test
pnpm test:verification
pnpm build
pnpm format:check
node scripts/check-migration-generation.mjs
```

Full audit intentionally returns nonzero while findings remain. On the reviewed
workstation Docker's default address pool was exhausted: after checking allocated
subnets, the new project's network was assigned 10.240.56.0/24. No pruning or
existing database reuse occurred. Choose an unused local subnet if necessary.

Hosted CI must retain its fresh-checkout install, secret scan, restricted grants,
browser/axe/keyboard/native zoom, database/SMTP outages, encrypted-backup fixtures,
populated restore, pinned rollback and deployment-failure recovery. Preserve all
old evidence at its original SHA. No visual redesign or replacement screenshots
are needed for this maintenance increment; fresh browser artifacts are regression
evidence, not new product-design acceptance.

Human screen-reader testing remains pending (reviewer). Real-service acceptance
remains pending (operator): trusted HTTPS/renewal, independent secrets,
authenticated SMTP/approved recipients, off-host encrypted backup/restore,
external monitoring, actual alert receipt, retention and named recovery owner.
Source merge, image verification, staging acceptance and customer acceptance are
different milestones. No real recipient or paid resource is used here.
