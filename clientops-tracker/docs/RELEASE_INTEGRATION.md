# Release Integration Decisions

## Integration checkpoint: 20 November 2026

The owner authorized sequential merges subject to application and security gates and a no-build registry rehearsal after **each** main merge. No approval by a second human is claimed. Keep the [current checklist](ROADMAP.md) separate from the historical reviews below.

Reviewed #22 head `531ee3e8f3d6f818ad1c7a806f20de17dac591db` against `cfec6e71a51975e224a2cee9ddda2238183b8b31`: [CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/44792500392), [JavaScript/Actions analysis](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/44792492013) and [successful policy result](https://github.com/EdenCirakoglu/Client-Tracker/runs/136483789638). Next and its ESLint plugin move to 15.5.29; the patched PostCSS override stays scoped. The TS ESLint update removes the minimatch finding. One moderate build-tool finding remains under the documented conditional exception; not a clean full audit. Source and policy results are not release-image or host results.

The separately failing Git-connected Cloudflare `client-tracker` preview is a static-target configuration issue. Use the isolated installation-site instructions in [MONETISATION](MONETISATION.md). Its three-asset local build is not a successful Cloudflare deployment, the database/API staging host, or the live fictional walkthrough.

[#22 merged](https://github.com/EdenCirakoglu/Client-Tracker/pull/22) as `dfd50aebb52825c9bece80c550a3cc16f9a31fa4`. [Main push CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/44795137649) and [both GHCR jobs](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/44797572858) passed for this revision. Both pulled images' OCI revision labels matched. Neither application image was built locally.

| Published image                          | Registry digest                                                           | Installed package manifests inspected under /app    |
| ---------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| ghcr.io/edencirakoglu/client-tracker-api | `sha256:739435d05a90b72a974da62b17db8c0e695a8cf235780dde8ec774871cd258fd` | 130; no legacy loader, Kit or esbuild 0.18.20 found |
| ghcr.io/edencirakoglu/client-tracker-web | `sha256:51f1d296083fcd21f1fa227ae8e6bbe260d80f8702740d13c8b1ceba9c366eac` | 138; same check passed                              |

The disposable rehearsal passed nine checks: populated/idempotent migrations; startup/readiness; production-mode cookie login; ticket/comment visibility and organisation isolation; agreement, release and client acceptance with captured SMTP; database outage/recovery; fresh login retaining the decision; recreation retaining the twelve-table fingerprint; logout replay rejection. Ticket status remained IN_PROGRESS when acceptance became ACCEPTED. This was not a trusted Internet host, real inbox or off-host recovery. The temporary containers were stopped, without deleting the volume.

Reproduce from the release-preparation workspace with Docker and an unused suffix, port and subnet:

```powershell
$env:RELEASE_INSTANCE='nov20-recheck'
$env:RELEASE_HTTPS_PORT='8494'
$env:RELEASE_SUBNET='10.240.76.0/24'
$env:RELEASE_HTTPS_TRANSPORT='container'
node scripts/verify-registry-release.mjs dfd50aebb52825c9bece80c550a3cc16f9a31fa4 sha256:739435d05a90b72a974da62b17db8c0e695a8cf235780dde8ec774871cd258fd sha256:51f1d296083fcd21f1fa227ae8e6bbe260d80f8702740d13c8b1ceba9c366eac
```

Original report: `test-results/clientops-published-dfd50aebb528-nov20-pr22/verification.json`, SHA-256 `d0f5f24d7426235adb7230b4b7d43f03116e459fa288d18498d92a6bdf4391ab`. Harness SHA-256 `471ec754951306fae735bed0ff2ff30f8fbdf63dcfa5f142ab7904b5ebded0e6`. [Release evidence on #22](https://github.com/EdenCirakoglu/Client-Tracker/pull/22#issuecomment-7048201194).

[#34](https://github.com/EdenCirakoglu/Client-Tracker/pull/34/files) now targets this verified main. Its reconciliation at `4fc947a5078abb3a06b10393efe3723291160836` preserved the original walkthrough files. Head [9e46be31](https://github.com/EdenCirakoglu/Client-Tracker/commit/9e46be310e35c3dfda65b6043114c670e92b73bc) adds the separate three-asset installation page, nested Wrangler config and CI smoke test. Checks for this head: [application CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/44808588922), [CodeQL analysis](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/44808583382), [CodeQL policy](https://github.com/EdenCirakoglu/Client-Tracker/runs/136539153747). Local frozen install, lint, formatting, browser smoke (desktop/light and mobile/dark) and Wrangler 4.162.0 dry run passed, with three files and no bindings. No migrations or worker schema changes in this increment.

The Git-connected `client-tracker` build failed on the preceding candidate **and** on the push to main. It is not the existing `proud-credit-1b94` walkthrough or an application CI job. On inspection the public walkthrough responded to a read-only request and its HTML differed from the repository copy. Do not republish that copy over it. Before merging this visitor-facing increment, connect the private static-preview target and verify that main builds upload a version without promoting a public deployment ([owner steps](MONETISATION.md#current-payment-contract-20-november-2026)). Retest the actual PR head; a Wrangler dry run without account access does not verify a hosted preview.

## Historical preparation: 16 November 2026

Main remains `cfec6e71a51975e224a2cee9ddda2238183b8b31`. No PR merge, closure,
alert dismissal, risk acceptance, paid resource or external deployment occurred.
The single current completion checklist is [ROADMAP](ROADMAP.md). The separate
preparation branch starts from #44 `8392f9026115940dd634f671c1eed9fafd676fe8`;
it adds a read-only staging preflight and practical operator/commercial materials,
not a new visual or product increment. #43's design and evidence are preserved.

### Candidate Changes and Checks

| PR                                                             | Exact head / actual parent tip                                                                  | Result and next integration action                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [#22](https://github.com/EdenCirakoglu/Client-Tracker/pull/22) | `535692ba67ef9648af22810be718c50992571658` / main `cfec6e71a51975e224a2cee9ddda2238183b8b31`    | #44 tests backported plus explicit AI-assisted per-alert verdicts. [CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/43881461471): 206 API, 30 helper, 15 browser scenarios, operational checks. [Analysis executed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/43881251528); [policy failed](https://github.com/EdenCirakoglu/Client-Tracker/runs/133347637077). Independent security/tooling decisions still block recommending merge. |
| [#34](https://github.com/EdenCirakoglu/Client-Tracker/pull/34) | `a6a343cb9f9d278dadf9377f26d6b96d2dd90eb9` / #22 now `535692ba67ef9648af22810be718c50992571658` | Existing CI remains historical; merge-tree with refreshed parent succeeds. After approved #22 merge, retarget to main, reconcile backported tests and run fresh CI/CodeQL.                                                                                                                                                                                                                                                                                                        |
| [#35](https://github.com/EdenCirakoglu/Client-Tracker/pull/35) | `c9cda1d89f30dc01c04cc23983611302484b6c28` / #34 `a6a343cb9f9d278dadf9377f26d6b96d2dd90eb9`     | Existing CI passes, no applicable current CodeQL head result. Retarget/revalidate only after approved parent.                                                                                                                                                                                                                                                                                                                                                                     |
| [#36](https://github.com/EdenCirakoglu/Client-Tracker/pull/36) | `36a50f13eb30d4de6d26a989e3693b9f77035193` / #35 `c9cda1d89f30dc01c04cc23983611302484b6c28`     | Existing two-job CI passes. Fixture isolation and config diagnostics are retained in #37. Later head evidence cannot replace eventual main integration checks.                                                                                                                                                                                                                                                                                                                    |
| [#37](https://github.com/EdenCirakoglu/Client-Tracker/pull/37) | `5d9a02affaac6388dc54549309c49ef1cf05212e` / #36 `36a50f13eb30d4de6d26a989e3693b9f77035193`     | Workflow conflict resolved without runtime changes. [Fresh run](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/43883782112) is the authoritative final-head result; see final PR handoff. No applicable CodeQL head result, not a security pass.                                                                                                                                                                                                                    |
| [#43](https://github.com/EdenCirakoglu/Client-Tracker/pull/43) | `46c2c8575a193e0ca08088f65647552acbcef8e6` / #37 now `5d9a02affaac6388dc54549309c49ef1cf05212e` | Design unchanged; historical four-job CI/45 browser scenarios retained. New parent merge-tree identifies a workflow-only conflict: preserve all four #43 jobs and exclude intro/review/portal scenarios from core. Resolve/revalidate after approved #37 integration; do not discard portal coverage.                                                                                                                                                                             |
| [#44](https://github.com/EdenCirakoglu/Client-Tracker/pull/44) | `8392f9026115940dd634f671c1eed9fafd676fe8` / #43 `46c2c8575a193e0ca08088f65647552acbcef8e6`     | Historical CI passes; backported two test files must remain one identical copy when integrating later. Retain remaining documentation and original evidence, resolving its dated assertions explicitly.                                                                                                                                                                                                                                                                           |

Some GitHub PR responses cache the old `base.sha`; the table uses actual fetched
branch tips. #37's reconciliation commit `635b9abdc5908298c9602b1e6166fb66b7aedf6e`
preserved #36 fixture isolation and #37 review selection. Its review job reproduced
an axe/context-clock race (13/14 passed), not a rate-limit/login failure. Final
head backports #43's existing `ea13aecbe01c814c1cd367a00b8eae6088e31ffa` test fix:
frame-free assertion plus in-page axe execution. No retry, timeout increase or
accessibility assertion removal. [Failure/artifact provenance](LOGIN_INTRO.md#november-16-integration-verification)
remains visible. Historical invitation/restart failure `5068312` remains unexplained;
later passes cannot establish a cause whose original diagnostics were absent.

### Separate Dependency PRs

All below remain open against main; actual current main is cfec6e71, regardless
of cached older base SHAs. These are individual historical checks, not combined
release approval. Every listed CodeQL policy check is **neutral**, not successful
applicable analysis. No unrelated upgrade was added to this release.

| PR                     | Exact head                                 | Existing application CI                                                          | Disposition                                                                             |
| ---------------------- | ------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| #25 ESLint JS          | `3fe5de57fdcaa5d41fe4424932c8187b343e891b` | [Pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42261968317) | Separate patch review against integrated main; not needed for these two advisories.     |
| #26 tsx                | `9b4cf26875211f2a4c971e5ac34d617a23cc0025` | [Pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42270297694) | Separate tooling patch, refresh before any merge decision.                              |
| #27 Helmet             | `ea4eb1478bcc9dc76f460bd3556807036ffc2371` | [Pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42261938601) | Separate security-header compatibility review; no automatic grouping.                   |
| #29 Express 5          | `a2ff20ab03c3b0247e31fc656e6e1c9a50415e51` | [Fail](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42270296077) | Defer deliberate controller/route-type migration; no major framework change here.       |
| #30 React DOM/types    | `ac6061245e9c95295eb7bb8037efc0fcc2881230` | [Fail](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42261997774) | Reconcile supported React/DOM/type pair separately before reconsidering.                |
| #38 Vitest 5           | `31716cab2a8d2bbf8acfcee409ef5a088de308b8` | [Pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42990888050) | Defer coordinated major tooling work.                                                   |
| #39 Tailwind 4         | `d6f9bf950d7dd9e8db42867cfd00be4004e9d813` | [Fail](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42990937997) | Defer; preserve the owner-reviewed visual candidate.                                    |
| #40 express-rate-limit | `9fcf20365d06d4b011aa137b09855cbd58b49ace` | [Pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42990972985) | Separate compatible patch review with proxy/rate-limit tests against integrated main.   |
| #41 TypeScript ESLint  | `578de39ea1083f6dc94e1e9c5d104d333da79e04` | [Pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42991120292) | Does not resolve minimatch's patched-major requirement; do not call it a remediation.   |
| #42 Vite 8             | `717b595e5fc9dfcc54d367b77604d06e71b40539` | [Pass](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42991682042) | Defer coordinated tooling upgrade; isolated pass does not prove combined compatibility. |

### Exact Next Decision and Publication Consequence

Review #22 first at the head/base above. [Per-alert source verdicts](CSRF_REVIEW.md)
are AI-assisted and conditional, **not independent human approval**. Ask the
selected reviewer to accept/reject each classification or specify the missing
control. Eden must separately decide the two [bounded tooling proposals](DEPENDENCY_REMEDIATION.md).
No merge is requested until these gates have a recorded resolution. Successful
main push CI after an eventual approved merge automatically publishes both images.

For **every** approved merge, run from a clean checkout of the resulting main:

```powershell
$repo='EdenCirakoglu/Client-Tracker'
gh run list --repo $repo --commit $RELEASE_SHA --workflow ci.yml
gh run list --repo $repo --commit $RELEASE_SHA --workflow docker.yml
# Both workflows must succeed for this exact SHA; a tag alone is not verification.
docker pull "ghcr.io/edencirakoglu/client-tracker-api:$RELEASE_SHA"
docker pull "ghcr.io/edencirakoglu/client-tracker-web:$RELEASE_SHA"
docker image inspect "ghcr.io/edencirakoglu/client-tracker-api:$RELEASE_SHA" --format '{{json .RepoDigests}} {{json .Config.Labels}}'
docker image inspect "ghcr.io/edencirakoglu/client-tracker-web:$RELEASE_SHA" --format '{{json .RepoDigests}} {{json .Config.Labels}}'
$env:RELEASE_INSTANCE='owner-approved-run'
$env:RELEASE_HTTPS_PORT='8494' # Check availability and choose an unused fixture subnet.
$env:RELEASE_SUBNET='10.240.76.0/24'
node scripts/verify-registry-release.mjs $RELEASE_SHA $API_DIGEST $WEB_DIGEST
```

Record both immutable digests/revision labels and the generated
`test-results/clientops-published-<revision-prefix>-<instance>/` report. The script
refuses existing verification volumes and pulls by digest without rebuilding.
Its disposable/demo-mode runtime evidence is not private production-mode host
acceptance. Do not publish TLS keys or private rendered configurations.
Migration 0007 requires draining old outbox writers; preserve backups and validate
the previous **compatible** pair on a restored copy. No arbitrary old-image rollback.
The [private staging runbook](PRIVATE_STAGING.md) supplies production-mode ingress,
secret, SMTP, restore, monitoring and human acceptance separately.

## Historical Preparation: 15 November 2026

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
