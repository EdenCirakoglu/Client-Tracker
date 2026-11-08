# PR #22 Integration Review

Date: 2026-11-08. Branch: `feature/agency-onboarding-notifications`.
Base: main `cfec6e71a51975e224a2cee9ddda2238183b8b31`.
[PR](https://github.com/EdenCirakoglu/Client-Tracker/pull/22) /
[complete diff](https://github.com/EdenCirakoglu/Client-Tracker/pull/22/files).
It remains **draft and unmerged**. No auto-merge, risk acceptance, alert dismissal,
real email, publication or deployment was performed by this increment.

## Integration

The old maintenance base was replaced with main, after a new
[published-image rehearsal](RELEASE_CFEC6E71.md) passed. A normal merge commit
`5f220bd` preserves both histories. Validation conflicts combine product
recipient-array checks and maintenance summary-array checks. Both launch and
review fixture names survive. Evidence conflicts retain explicitly historical
results. The candidate lockfile and package versions match main: tsup 9 and all
reviewed security patches are retained, without a broad upgrade.

Migration 0007 remains the product's only additional migration; earlier SQL and
snapshots are not rewritten. Before upgrading an installation, stop/drain
incompatible older API/workers. The expanded outbox contains workflow notices;
an older account-only worker must not process it. Preserve the encrypted payload
key and use a compatible API/worker/schema combination for recovery, not an
arbitrary older tag. See [worker compatibility](LAUNCH_PRODUCT.md).

## Verification Provenance

The first integrated application/demo revision was
`b84e480b31e0ca49830e490b472bd85b38d2ce11`. Its local checks:

| Command                                                 | Actual result                                                                                      |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                        | Passed; no resolution or lockfile change                                                           |
| `pnpm audit --prod`                                     | Passed, zero known production dependencies flagged                                                 |
| `pnpm audit`                                            | Exit 1; two moderate development-tool findings, not accepted                                       |
| `pnpm lint`, `pnpm typecheck`, `pnpm format:check`      | Passed                                                                                             |
| `pnpm test`                                             | 198 API tests passed, 22 files; dedicated new cluster                                              |
| `pnpm test:verification`                                | 30 helper tests passed                                                                             |
| `pnpm build`                                            | API tsup 9 and web Next 15.5.28 builds passed                                                      |
| `node scripts/check-migration-generation.mjs`           | No unexpected change; historical files preserved                                                   |
| `node scripts/hardening-stack.mjs start --private-demo` | New populated legacy fixture upgraded without reseeding; restricted-role application healthy       |
| `node scripts/verify-database-roles.mjs --private-demo` | Runtime destructive/DDL/escalation denied; backup role read-only                                   |
| `node scripts/verify-operations.mjs --private-demo`     | DB outage/recovery, captured SMTP outage/retry, restart, concurrent workers and stale links passed |
| `pnpm exec playwright test e2e/private-demo.spec.ts`    | Shipment scenario passed; keyboard submission, axe, mobile width and persisted changes             |

Use the explicit disposable environment in [CSRF review](CSRF_REVIEW.md) for
API tests and the [private-demo commands](PRIVATE_DEMO.md) for browser tests.
Local Node used the operating system CA store for registry audit access.
Local Docker builds used the approved inspection CA secret mount; it is not
copied into the app or committed. Public images were verified separately without builds.

The first full-page demo captures exposed a **capture artefact**: following
`#delivery` leaves the fixed header at that scroll position in a full-page image.
The capture now scrolls to zero; application layout and focus behavior are unchanged.
The final PR handoff records the final tested head, normal pull-request CI,
browser artifact/checksum and inspected captures. Do not relabel the initial
run above as evidence for a later commit.

## Security Policy Is Not Scanner Execution

At `b84e480`, [Actions and JavaScript CodeQL analysis](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42497923565)
succeeded, while the [policy check](https://github.com/EdenCirakoglu/Client-Tracker/runs/128784325929)
**failed**: one high `js/missing-token-validation` alert at
`apps/api/src/middleware/session.ts:34-42`. The registered global guard runs
before all mutation routers; the maintained csrf-sync check is not among the
query's explicit middleware recognizers. Seven CSRF regressions include
negative proof matrices and persisted positive controls on actual product routes.
No demonstrated bypass was found. The proposed false-positive disposition still
requires an independent review of [flow, routes, controls and reproduction](CSRF_REVIEW.md).
Existing main alert #3 (production cookie assessment) is a separate open finding.
Do not infer a clean policy result from successful analysis jobs.

The historical invitation/restart failure at `5068312` remains unexplained.
The retained strict test passed with improved diagnostics in this local run;
that does not establish the original cause. No retries/assertions/timeouts were
relaxed. [Full-audit findings](DEPENDENCY_REMEDIATION.md) remain visible.

## Review and Launch Boundaries

The five-minute [private demo](PRIVATE_DEMO.md) demonstrates the running
request -> revised agreement -> linked release -> client changes workflow.
The Decision Journal image is a **concept only**. The portal does not implement
a shipment-search engine; failed search examples are fictional client feedback.
Human screen-reader testing, real-service acceptance and a paid pilot remain
outstanding, with owners in [the current checklist](ROADMAP.md).

PR #22 is ready for inspection, **not recommended for merge while the security
policy decision is unresolved**. A future separately approved merge triggers
automatic API/web publication after successful main push CI. Require exact-main
CI and both publishing jobs, then pull both images by digest and verify them
without rebuilding. Local fixture success is not staging or customer acceptance.
