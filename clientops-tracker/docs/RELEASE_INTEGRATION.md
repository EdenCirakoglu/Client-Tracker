# Release Integration Decisions

## Current Preparation: 15 November 2026

No PR is merged, retargeted, closed or approved in this preparation. No alert is
dismissed and no deployment/check configuration changes. Visual acceptance stays
with the owner: preserve PR #43 at `46c2c8575a193e0ca08088f65647552acbcef8e6`.
The isolated `release/security-integration-review-2026-11-15` branch starts there;
its incremental changes are security regression tests and release documentation,
not application/design/dependency changes. Tests can be reviewed/backported
separately; they do not establish a security disposition.

### Refreshed Stack

Fetched main remains `cfec6e71a51975e224a2cee9ddda2238183b8b31`. Its existing
[main CI, publications and immutable image evidence](RELEASE_CFEC6E71.md) remain
valid for that maintenance revision, not for the product stack. No registry
rehearsal was repeated: source/release revision did not change. The PR #43
[four-job CI run](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/43719140818)
and [matched visual evidence](MERIDIAN_COMPOSITION_REVIEW.md) remain historical
evidence for their recorded sources; no new visual claim is made here.

| Draft PR                                                       | Actual head                                | Base ref (actual current tip)                                                       | Current conclusion / integration work                                                                                                                                                                                                                                                                                                                                        |
| -------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#22](https://github.com/EdenCirakoglu/Client-Tracker/pull/22) | `9e25bc27d73ae1756c8fc185223704417de8642b` | main, `cfec6e71a51975e224a2cee9ddda2238183b8b31`                                    | Mergeable; [normal CI passes](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42499222820), [analysis executes](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42499216703), but [CodeQL policy fails: one high alert](https://github.com/EdenCirakoglu/Client-Tracker/runs/128788230364). Next independent review, not ready for merge approval. |
| [#34](https://github.com/EdenCirakoglu/Client-Tracker/pull/34) | `a6a343cb9f9d278dadf9377f26d6b96d2dd90eb9` | feature/agency-onboarding-notifications, `9e25bc27d73ae1756c8fc185223704417de8642b` | Mergeable; [CI passes](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42504475000). No applicable CodeQL result in head checks; refresh against approved main later.                                                                                                                                                                                           |
| [#35](https://github.com/EdenCirakoglu/Client-Tracker/pull/35) | `c9cda1d89f30dc01c04cc23983611302484b6c28` | feature/journal-brand-product-hunt, `a6a343cb9f9d278dadf9377f26d6b96d2dd90eb9`      | Mergeable; [CI passes](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42865593388); Workers build fails separately. No current CodeQL result in head checks.                                                                                                                                                                                                   |
| [#36](https://github.com/EdenCirakoglu/Client-Tracker/pull/36) | `36a50f13eb30d4de6d26a989e3693b9f77035193` | feature/first-customer-guidance, `c9cda1d89f30dc01c04cc23983611302484b6c28`         | Mergeable; [both CI jobs pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/43063977172); Workers fails. Later fixture-isolation/diagnostic fixes must survive integration.                                                                                                                                                                                  |
| [#37](https://github.com/EdenCirakoglu/Client-Tracker/pull/37) | `6b07dee441281b959cbc2cb64fd4e5fdc89fcc56` | feature/logo-intro, `36a50f13eb30d4de6d26a989e3693b9f77035193`                      | **Conflicting base**; [historical CI passes](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42926264757), not verification of the later #36 integration. Workers fails; no current CodeQL result.                                                                                                                                                              |
| [#43](https://github.com/EdenCirakoglu/Client-Tracker/pull/43) | `46c2c8575a193e0ca08088f65647552acbcef8e6` | feature/meridian-ticket-review, `6b07dee441281b959cbc2cb64fd4e5fdc89fcc56`          | Mergeable against its present base; four CI jobs pass; Workers fails; no current CodeQL result. Design remains unchanged and owner acceptance pending.                                                                                                                                                                                                                       |

The #37 API response still reported cached `base.sha` `23484934143dc4f885d70b34a172337053fd8d61`;
the fetched base branch and branch API resolve to `36a50f13eb30d4de6d26a989e3693b9f77035193`.
Read-only `git merge-tree --write-tree origin/feature/meridian-ticket-review origin/feature/logo-intro`
returned exit 1: only `.github/workflows/ci.yml` conflicts. The notification test
auto-merges. Reconcile the browser-job selection while retaining #36's isolated
fixtures/config-response diagnostics and #37's scope-review helper/new tests.
Do not take an entire older workflow or test file. #43 already carries the later
CI isolation; no changes to these branches were needed or performed here.

### Security and Tooling Gates

[Fresh request-path/cookie review](CSRF_REVIEW.md) separates reproducible controls
from the independent decisions on alerts #1 and #3. The former is present on the
exact #22 head; the latter remains open on main, not a second new #22 policy alert.
The two [full-audit development findings](DEPENDENCY_REMEDIATION.md) remain
unresolved; proposed temporary restrictions are **not accepted**. A clean runtime
npm audit is not a clean full audit, OS scan or application-security assessment.

### Cloudflare: Diagnosed Separately

The owner-supplied November 15 log for Worker `client-tracker`, build
`583b8eab-070e-49d4-945f-2066a39e9955`, establishes this failure:

- Clone succeeded. No dependencies/build output were detected for caching.
- The configured deploy command was `npx wrangler preview`; npm installed
  unpinned Wrangler `4.162.0` because none was present.
- It exited 1: Wrangler configuration lacks the required `previews` block.
  This is a configuration failure before application compilation, not flaky CI.
- [Cloudflare documents that requirement](https://developers.cloudflare.com/workers/previews/configuration/).
  Adding only `previews: {}` would address this first validation error, **not**
  prove a valid or authorized application deployment.

GitHub check `132827219764` reports this separate Worker build, not the successful
four-job application CI. The configured root directory and any separate build
command are still unconfirmed: the cache message alone cannot identify the root.
No Wrangler/OpenNext deployment configuration exists in the reviewed repository.
The working portal is Next.js standalone + Express + PostgreSQL + worker + Nginx
under Compose, not a ready-made Workers service. A Workers port is not authorized.

The existing public `proud-credit-1b94` site is a different static fictional
walkthrough. Read-only HTTP check returned 200 and title
`ClientOps Tracker | Fictional walkthrough preview`; it was not modified.
Keep its already working release untouched. Owner next input: confirm whether
`client-tracker` is meant to preview a **separate static artifact**, and provide
its configured root/build settings. Only after target approval should a narrowly
scoped, pinned Wrangler/static-assets configuration be prepared. No preview
command, deployment, check removal or Git-connection change was performed.

### Next Eligible Action

Review **#22**, head `9e25bc27d73ae1756c8fc185223704417de8642b`, base
`cfec6e71a51975e224a2cee9ddda2238183b8b31`, with the independent security packet.
It is eligible for review, **not currently recommended for merge**. Keep the
sequence #22 -> #34 -> #35 -> #36 -> #37 -> #43 as separately approved decisions.
After each approved parent lands, retarget the next PR to actual main, inspect
the incremental diff, resolve conflicts and rerun normal CI plus applicable
CodeQL analysis **and policy**. Do not merge a product PR into its feature base.

Every approved main merge automatically publishes API/web images after successful
main CI. Record the resulting SHA, exact main CI and both publication jobs, image
revision labels and digests. Pull both by digest without rebuilding; verify
migrations, login, workflow/tenant denial, restart persistence and applicable
recovery in an isolated stack before advancing. Migration 0007 and the outbox
worker require compatible writers: stop/drain incompatible older API/workers,
back up, migrate explicitly, then start the supported pair. An arbitrary older
image is not a rollback plan. [Private staging gates](PRIVATE_STAGING.md) remain
separate from these source/release checks.

## Historical 6 November Decisions

## Post-Merge Update

The owner has now merged #20 as `e114a0e64c9736b84db2fdb2d9ed330c650eb136`.
[Exact-main CI, both publications and digest-pinned runtime verification](RELEASE_E114A0E.md)
passed. #31 now targets main with that history reconciled; its current dependency
results and review boundary are in [TSUP9_REVIEW.md](TSUP9_REVIEW.md). No other PR
was merged/closed and no risk was accepted in this run. For every future approved
merge, require new main CI, both publications and digest-only runtime verification.

The pre-merge snapshot below is historical, including its PR heads and statuses.
Its unapproved tooling decisions and restrictions still require explicit review.

## Historical Pre-Merge Snapshot

Preparation only. All 15 PRs remain open and unmerged. No auto-merge, merge queue,
closure, alert dismissal, real-recipient email, checkout or deployment is authorized.
Main remains `38b6ef17f2a2399c5d444da153081167e2b9feae`.
Historical checks remain tied to their original revisions.

## Expired Tooling Decision

The November 4 deadline passed **without acceptance**. The earlier proposed
exception is not an active approval. Customer installation is blocked until
the owner explicitly decides or the dependency is remediated.

| Item                     | Current evidence / proposed decision                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Advisory                 | [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99), moderate, esbuild <=0.24.2; patched >=0.25.0                                                                                                                                                                                                                                                                                                    |
| Exact path               | API devDependency `drizzle-kit@0.31.11 > @esbuild-kit/esm-loader@2.6.5 > @esbuild-kit/core-utils@3.3.2 > esbuild@0.18.20`                                                                                                                                                                                                                                                                                                 |
| Invocation / exposure    | Migration generation and optional Studio/config loading. The advisory concerns esbuild's development HTTP server/CORS; the application does not invoke that server. This is exposure analysis, not a fix.                                                                                                                                                                                                                 |
| Supported remedy checked | Registry stable Kit remains 0.31.11; it still declares the legacy loader. Direct Kit esbuild ^0.25.4 does not replace the nested copy. [Drizzle releases](https://github.com/drizzle-team/drizzle-orm/releases) list 1.0 release candidates with broader changes; no compatible stable parent remedy was established. Do not force a legacy-loader override or a release-candidate ORM migration just to clear the count. |
| Proposed scope           | Temporary source-review/trusted-build use only. No customer installation, public Studio or esbuild serve. Generate only from reviewed repository schemas in isolated local/CI tooling, without customer credentials or untrusted config. Keep tools out of runtime images and verify image contents after approved publication.                                                                                           |
| Owner / approver         | Repository maintainer monitors upstream and prepares a supported replacement; Eden Cirakoglu must explicitly approve/reject the bounded exception. No acceptance inferred from silence or CI.                                                                                                                                                                                                                             |
| Proposed expiry          | 20 November 2026, or before any customer installation, whichever occurs first. This is a new proposal, not an automatic extension of the missed deadline. Review weekly and immediately on a supported fix or changed exposure.                                                                                                                                                                                           |
| Exit / rejection         | Adopt supported parent/loader removal with generation, populated migration, restricted grants and restore verification. If exception rejected, keep source release blocked until that remedy is reviewed.                                                                                                                                                                                                                 |

## Audit Refresh

On November 6, maintenance production audit reports zero known production npm
findings. The full audit is not clean. PR31's supported tsup 9/esbuild 0.28.2 fix
remains separate and unmerged; maintenance/product still carry tsup's
[GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr).

A **new** moderate development finding is also visible:
[GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249),
root `typescript-eslint@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 >
minimatch@10.2.5` through parser/type-utils/utils/project-service paths (seven
paths, one advisory). Affected >=7 <11.0.1, patched >=11.0.1. The actual invocation
is ESLint's repository TypeScript project/glob handling, not a request endpoint.
Use trusted configurations and bounded repository inputs; do not claim fixed.
PR24's estree 8.72 still declares minimatch ^10.2.2 and therefore is **not** the
supported remedy for this new issue. Maintainer: investigate a parent release
supporting minimatch 11 in a separate tooling candidate. Owner review is required
before first installation; no new tooling exception is approved here. Full audit
continues to fail visibly. These audits cover neither OS packages nor application
logic, CodeQL results, secrets or external services.

## PR-by-PR Disposition

Heads/bases below were rechecked before edits. Final preparation heads/check links
are recorded in the PR handoff after CI. None of the historical greens establish
combined-release compatibility.

| PR  | Inspected head                             | Base        | Checks / disposition                                                                                                                                                                                                                     |
| --- | ------------------------------------------ | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 14  | `f89d51bad8681d78b4d91f8999f294d12d40aaf7` | main        | Prior CI/CodeQL pass. Nodemailer 10.0.9 superseded by main ^10.1.7; recommend separately authorized closure, not downgrade.                                                                                                              |
| 20  | `4a37eb3890a5e39368dd05fa3194e301284492fc` | main        | Prior CI and policy success. First PR for source review; overdue Kit decision and new tooling finding explicit.                                                                                                                          |
| 21  | `e3a7c5a6acb4b20e54507ced7f3c21fabfcdef85` | main        | CI pass, CodeQL neutral/missing. Superseded only after #20's Vite 7.3.7 replacement merges; no closure now.                                                                                                                              |
| 22  | `f2be50394906d355e51a81cf4cc186bf467c4185` | maintenance | CI/analysis execution pass, **CodeQL policy failure: one high alert #1**. See product CSRF review; retain stack until separately approved maintenance merge.                                                                             |
| 23  | `92535ce8e9829003cfd4a045916e1fec33e722d3` | main        | CI pass, CodeQL neutral. Defer Vite 8 coordinated with Vitest 5.                                                                                                                                                                         |
| 24  | `68e2d648665950f8b9aa68a4ca9e7382c26c705b` | main        | CI pass, CodeQL neutral. Candidate TypeScript ESLint update, not combined approval; does not fix current minimatch finding.                                                                                                              |
| 25  | `ac7b02e415231c5eb090d8437d0294b409ccf71e` | main        | CI pass, CodeQL neutral. Compatible-looking ESLint JS patch; refresh and verify actual plugin combination separately.                                                                                                                    |
| 26  | `3653a7ea73bace5666436f69d030b79236368479` | main        | CI pass, CodeQL neutral. tsx patch candidate; verify development/migration CLI paths after refresh.                                                                                                                                      |
| 27  | `4a1efd8ac65b0828a72ddf99729bda19c9b7fdf1` | main        | CI pass, CodeQL neutral. Helmet minor candidate; verify CSP/headers/Swagger after refresh.                                                                                                                                               |
| 28  | `a4bbf764021360a29aec492b67b98acf9852ff1c` | main        | CI pass, CodeQL neutral. Defer coordinated Vitest 5/Vite 8 change.                                                                                                                                                                       |
| 29  | `566cb91cdcd77176653528b5ed6293672b32b7ea` | main        | CI fails controller route-parameter typechecks. Express 5 needs deliberate migration, not automatic merge.                                                                                                                               |
| 30  | `4d219cec704ed950a9041b79dcda76a928af1f24` | main        | CI build failure, React 19.2.7 vs DOM 19.3.1. Align supported runtime/types before reconsidering.                                                                                                                                        |
| 31  | `c1e1efcd7cbeba5725584a426e8f7b2f76e80b15` | maintenance | Prior CI/CodeQL policy success. Supported tsup/esbuild fix; retarget/recheck only after approved #20 main.                                                                                                                               |
| 32  | `56697e3257913f09cfa8d7f39dbeaf9e0cf686ba` | main        | CI pass, CodeQL neutral. Superseded after #20 merges; preserve its Kit and wrapped-error changes.                                                                                                                                        |
| 33  | `2b449dfa6496f0e4f2937c47c65c263edf578a52` | main        | CI fails Typecheck; subsequent browser-artifact privacy step also fails with no browser run. CodeQL neutral. Zod 4.6.6-only bump superseded by reviewed 4.6.7 migration/tests in #20; closure only after replacement merge and approval. |

## Separate Approval Gates

1. Review #20 against current main and decide the documented risk proposal.
   No merge occurs in this preparation.
2. After an explicitly approved #20 merge, require successful **main CI at the
   resulting SHA**, both API/web publication jobs, and independent runtime
   verification of pulled **digest-pinned images without rebuilding**. Cover
   migration/startup, accounts, representative workflow, outage recovery and
   persistence in a separately named stack.
3. Then retarget #31 to that approved main, inspect its incremental diff and
   obtain fresh CI plus actual analysis and policy-check conclusions. Request
   a separate merge decision. Repeat the exact-main CI/publication/digest checks.
4. Then reconcile #22 against approved main: keep product behavior, both security
   and recipient tests, all historical migrations and supported lock resolutions.
   Regenerate with pinned pnpm, never take an old lockfile wholesale. Retarget,
   inspect incremental diff, run fresh CI/CodeQL and resolve the alert disposition.
   After separate approval, repeat main CI and both digest-pinned image checks.

Every approved main merge can trigger automatic API/web image publication after
successful push CI. Publication is not deployment or customer acceptance.
Migration 0007 requires draining incompatible older account-only writers/workers
and a matching API/worker combination. Preserve verified backup, explicit
privileged provisioning/migrations and restricted runtime roles. Recovery uses a
tested schema-compatible pair or repair-forward, not arbitrary older images.

The original invitation/restart failure at 5068312 remains unexplained because
its log omitted diagnostic details. Later strict passes do not establish cause.
Use improved safe phase/status diagnostics; keep assertions and deadlines intact.
