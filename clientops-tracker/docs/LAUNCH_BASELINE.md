# First-Customer Launch Baseline

## Maintenance Follow-up

PR #19 is merged at `70246650a1ef80096fe74b08213d62d19323e787`; PR #20 is now a
draft against main, not against the former maintenance branch. Its verified
`d9099b6febd6ac5f682649ae4d109909d9215d30` results remain tied to that revision.
See [proposed tooling decisions](DEPENDENCY_REMEDIATION.md#follow-up-review-decisions):
none has owner acceptance yet. The retargeted follow-up head
`27c7dbb35a7fa855a87ad7ae05ef5034a663c4ec` passed
[fresh full CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39624281623)
and [fresh CodeQL analysis](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39623982321).
Its separate parser commit returns sanitized 400/413 responses. Analysis success
does not dismiss existing alerts. No #20 merge or subsequent image publication
is claimed. [Buyer-facing work](LAUNCH_PRODUCT.md) is on a separate dependent branch.

## Current Milestone 1B

The [dependency remediation inventory](DEPENDENCY_REMEDIATION.md) records the
candidate-lockfile advisories, exact paths, fixes, compatibility checks and
remaining decisions. Express/body-parser/qs and Drizzle are patched. Compatible
tooling updates and a narrow Next/PostCSS override reduce the full audit from
31 distinct GHSAs to four build-only findings; the production audit is clean.
The ORM upgrade also required bounded nested-error inspection to preserve the
existing 409 response for duplicate release versions; a failing-then-passing
database regression records that compatibility correction.
Residual tooling risk and the two open CodeQL classifications require owner
review. They are not dismissed or described as fixed.

Historically, the original remediation was based on then-unmerged PR #19's tested head
`7693de8131d9ea11dcff30dbd695219c64a4170d`.
[Its CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39603815386);
that evidence remains historical and is not evidence for the remediation head.
The new PR handoff identifies its own exact tested SHA, checks and artifacts.
PRs #14/#18 stay open until a replacement is actually merged. No merge is authorized
for milestone 1B. The originally scoped next increment, administrator onboarding
and permission-rechecked workflow notifications, is now implemented in dependent
[draft PR #22](https://github.com/EdenCirakoglu/Client-Tracker/pull/22). Its own
[verification record](LAUNCH_PRODUCT.md) is separate from maintenance evidence.

## Historical Milestone 1A Record

The sections below preserve the original PR #19 investigation and dated findings.
Use the current inventory above for remediation status, not the old alert table.

## Scope and Provenance

Rechecked on 2026-10-21. Git root and workspace are separate: workflows live in
`.github/workflows/`; application commands run from `clientops-tracker/`.
Both worktrees started at `bc7eeaf131a606da39470ef9aec406a661eb7b08`; the main
worktree was clean and fetched main had not advanced. No stash, reset, history
rewrite, branch synchronization or database deletion was needed.

The maintenance candidate is [draft PR #19](https://github.com/EdenCirakoglu/Client-Tracker/pull/19)
on `release/launch-maintenance-2026-10-21`.
Dependency commit: `658aef7a5a8cf5bf57211a6efb87c3b345adec84`.
Its final tested commit and hosted checks are recorded on its PR and in the
review handoff. It is not a public deployment or customer-accepted release.
Keep [ROADMAP.md](ROADMAP.md) as the single current progress checklist.

## Existing Product Accounted For

- PR #16 merged delivery revisions, designated-reviewer agreement/acceptance,
  release links, client-safe exports, versioned scope decisions, portal summary
  preview/publication, named owners and delivery planning. Routes, services,
  migrations 0003-0006 and `e2e/product-workflows.spec.ts` /
  `e2e/delivery-planning.spec.ts` are present. No recreation in this candidate.
- PR #17 merged transaction-locked actor/project checks for ticket creation,
  updates, comments and triage; 22 focused race/permission regressions remain.
- Account email already has encrypted durable work, leases, bounded retries,
  expiry and administrator visibility. This is not workflow-notification support.
- Onboarding checklist, reviewer/decision notifications, live booking/checkout,
  real staging acceptance and customer-pilot evidence are not yet implemented
  or accepted. See [workflow evidence](FEATURE_RELEASE_VERIFICATION.md),
  [authorization review](TICKET_AUTHORIZATION_REVIEW.md) and
  [operator controls](OPERATOR_CONTROLS.md).

## Baseline Checks Actually Run

Unchanged main `bc7eeaf131a606da39470ef9aec406a661eb7b08`:

| Check                                       | Result                                                                                                                     |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Frozen install, lint, typecheck, formatting | Passed; Node 24 / pnpm 9.15.4, system CA trust retained                                                                    |
| API suite                                   | 161 passed, 17 files, 103.81 seconds, separate disposable PostgreSQL/Mailpit                                               |
| Verification helpers                        | 26 passed                                                                                                                  |
| API and web production builds               | Passed; frontend lint remains enforced                                                                                     |
| Hosted main CI                              | [37227250895](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/37227250895), success for this SHA              |
| Hosted API/web publication                  | [37228239554](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/37228239554), both jobs successful for this SHA |
| New published-image runtime verification    | Not performed by the baseline metadata inspection; historical image evidence remains revision-specific                     |

Docker was initially stopped. After starting Docker Desktop, the existing test
port 55434 failed with a Windows socket-permission error. `netsh interface ipv4
show excludedportrange protocol=tcp` confirmed the reserved range 55401-55500.
No port exclusion was removed. The next attempt hit exhausted Docker address
pools. Existing Docker IPAM and host routes were inspected, and only a new,
unused 10.240.50.0/24 fixture network was allocated. No networks were pruned.
Existing containers/volumes and the ignored `.env.test` were not replaced.

### Patched Candidate Checks

The dependency tree committed as `658aef7a5a8cf5bf57211a6efb87c3b345adec84`
passed frozen install, lint, typecheck, both production builds, 161 API tests
(17 files, 107.62 seconds), 26 verification helpers and formatting locally.
These commands ran before committing, with documentation edits present; they
are local working-tree evidence, not a clean-checkout hosted result. The PR
workflow checks out its exact head and must independently pass the full browser,
outage, restricted-role, backup, restore and deployment-failure suite.

The pinned secret scan found no leaks in 79 reachable commits before this
candidate was committed. Its first sandboxed attempt could not access Docker;
the same command passed with Docker access. The hosted scan will include the
new commits. No test assertion or timeout was changed. Existing historical personal-attribution exposure is documented in
[PUBLIC_INFORMATION.md](PUBLIC_INFORMATION.md); absence of detected credentials does not
erase public historical metadata.

The first candidate CI, [39603537785](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39603537785)
at `fffd46b3998b1ba208ab96c521b3a72754effe6e`, failed the secret gate before running
application checks. The same scan reproduced locally: `generic-api-key` matched
the public main SHA in the GHCR API image reference below. Its value is the
already-public Git revision, not an authentication secret. A narrowly scoped
allowlist requires both this exact document path and that exact SHA; no generic
SHA, file, directory or rule exclusion was added. Historical scanning remains
enabled. The missing browser report correctly failed the artifact-upload gate.
The subsequent PR run must pass independently; this failed run is not test evidence.

### Reproduce the Isolated API Baseline

From the workspace, with Docker Linux containers running. The example password
below belongs only to the expressly disposable fixture. Choose unused ports and
subnets on your machine. The network-create command is needed only once, and only
when automatic pools are exhausted; otherwise let Compose allocate its network.

```powershell
pnpm install --frozen-lockfile
$env:TEST_PG_PORT='15434'
$env:TEST_SMTP_PORT='11026'
$env:TEST_MAIL_PORT='18026'
docker network create --driver bridge --subnet 10.240.50.0/24 --label com.docker.compose.project=clientops-launch-tests-20261021 --label com.docker.compose.network=default clientops-launch-tests-20261021_default
docker compose -p clientops-launch-tests-20261021 -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@127.0.0.1:15434/clientops_hardening_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_hardening_test'
$env:SMTP_PORT='11026'
$env:MAILPIT_URL='http://127.0.0.1:18026'
pnpm test
pnpm test:verification
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
node scripts/secret-scan.mjs
```

Use `pnpm.cmd` if PowerShell blocks the pnpm script shim. With an intercepted
registry and trusted system CA, `NODE_OPTIONS=--use-system-ca` may be needed;
never disable TLS verification. Tests require explicit disposable configuration
and never fall back to development. Mail is captured locally, not delivered to
real recipients. The local port workaround is not a production setting.

## Published Baseline Coordinates

Registry manifests were inspected with `docker buildx imagetools inspect` for
both `:<full-main-SHA>` tags. Digests below are the OCI index digests, not the
different platform-manifest or attestation digests. Inspection alone is not a
pull, startup or persistence test.

| Image                                                                               | Registry index digest                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ghcr.io/edencirakoglu/client-tracker-api:bc7eeaf131a606da39470ef9aec406a661eb7b08` | `sha256:884b9b8b146a26187a18fc45ebe7278e28a1e2442eca8e092bc71af5a7c84b5d` |
| `ghcr.io/edencirakoglu/client-tracker-web:bc7eeaf131a606da39470ef9aec406a661eb7b08` | `sha256:4a71ae584175db1585969591a839fad9b93452f01824385ee9e91996d6a8c7d3` |

## Dependency Maintenance Decision

Open PR #14 proposed Nodemailer 10.0.9 and PR #18 proposed Next.js 15.5.27.
Their application CI passed ([mail](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/37227347775),
[web](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/38935096323)).
They remain separate open PRs, not silently merged or closed by this candidate.

Current upstream releases supersede those versions:

- Next.js and `@next/eslint-plugin-next`: **15.5.28**, preserving the 15.5 patch
  range and matching plugin/runtime. [15.5.27](https://github.com/vercel/next.js/releases/tag/v15.5.27)
  addresses cache poisoning; [15.5.28](https://github.com/vercel/next.js/releases/tag/v15.5.28)
  adds image-optimization RCE and Server Actions DoS fixes. No router migration.
- Nodemailer: **10.1.7**, within the same major. The
  [changelog](https://github.com/nodemailer/nodemailer/blob/v10.1.7/CHANGELOG.md)
  includes address-parser correctness/complexity, SMTP deadlines and stream
  hardening beyond 10.0.9. Existing SMTP timeouts, TLS policy, encrypted outbox,
  captured account flows and retries must pass unchanged.
- `proxy-addr`: **2.0.8**, a lockfile-only update within Express's existing range.
  [Advisory](https://github.com/jshttp/proxy-addr/security/advisories/GHSA-jqcg-44mw-7w3h):
  IPv4-mapped IPv6 trust-subnet spoofing. Current application trust is numeric
  hop count (0/1), not the vulnerable subnet configuration; the patched dependency
  is still used. Private API routing and trusted-proxy boundaries remain required.
- The Next subtree refresh includes Sharp 0.35.5/libvips 1.3.4. No application
  API/schema or unrelated direct dependency was changed. Frozen installs retain
  the reviewed resolution; ranges are not automatic deployment approval.

### Failed Updater Jobs Are Not Failed Application CI

All four inspected updater logs report `security_update_not_possible`, with a
latest resolvable version below the required patched version. They did not run
the application test suite. Do not rerun or relax application assertions to hide
these resolver failures.

| Updater run                                                                             | Package                 | Resolver result / patch required        |
| --------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------- |
| [39317975310](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39317975310) | postcss-selector-parser | 6.1.4 / 7.1.6                           |
| [39129498675](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39129498675) | source-map-js           | 1.2.1 / 1.2.2                           |
| [39004312373](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39004312373) | proxy-addr              | 2.0.7 / 2.0.8; candidate resolves 2.0.8 |
| [38468890431](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/38468890431) | shell-quote             | 1.8.4 / 1.11.0                          |

### Remaining Dependency Findings

The main alert inventory contained 32 open Dependabot alerts, including duplicate
Drizzle reports. This candidate is not a claim of a clean dependency audit.
The classifications below follow the actual lockfile, `pnpm why --recursive`,
application configuration and routes, not GitHub's runtime label alone.
No alert is dismissed. Maintainer owns remediation or documented acceptance
before customer/staging release; lower exposure is not equivalent to fixed.

| Alert IDs / package                                     | Current exposure and next action                                                                                                                                                                                                                                          |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 61, 62 / Next; 49, 53, 54 / Nodemailer; 63 / proxy-addr | Patched in candidate. Main alerts remain open until an approved merge and rescan. New upstream advisories are also considered above.                                                                                                                                      |
| 1, 6 / Drizzle ORM 0.38.4                               | Real vulnerable dependency. Reviewed identifier construction uses schema definitions and constant `deliveryViews`, not request-provided SQL identifiers. A separately verified ORM/tooling upgrade is still required; no exploitability dismissal.                        |
| 39, 40 / qs; 17 / body-parser                           | Express runtime parsing. JSON has a literal 1 MB limit and requests use strict Zod schemas, but parsing precedes validation. Treat patched dependency work as launch-blocking, not mitigated merely by passing API tests.                                                 |
| 7, 27, 28, 33 / PostCSS                                 | Next pins 8.4.31; the direct workspace 8.5.28 does not remove that copy. No untrusted CSS upload/compilation feature exists. Review a targeted compatible override or upstream fix with frontend build/browser tests; do not assume the direct package patch covers Next. |
| 64 / source-map-js; 65 / postcss-selector-parser        | Build/parser chains through Next/Tailwind/PostCSS. No user-supplied source-map or selector parsing endpoint. Review targeted compatible updates; selector parser crosses a major boundary and must not be forced blindly.                                                 |
| 60, 16 / shell-quote                                    | Drizzle Kit -> gel development tooling; application does not expose a shell/quote API. Patch the tooling chain separately, verify migration generation and avoid blindly forcing transitive APIs.                                                                         |
| 4, 9 / esbuild                                          | Drizzle Kit/tsx/tsup/Vite tooling, not an enabled esbuild development server in production. Keep development ports private; review toolchain updates separately.                                                                                                          |
| 12 / form-data                                          | Supertest/type tooling, no application multipart upload feature. Update test dependencies compatibly.                                                                                                                                                                     |
| 15, 34, 46 / js-yaml; 13, 14, 57, 58 / brace-expansion  | ESLint/minimatch tooling. No untrusted YAML/glob API. Update lint toolchain compatibly; ESLint 9 also reports upstream end of support.                                                                                                                                    |
| 37, 38 / browserslist; 41 / baseline-browser-mapping    | Frontend build targets; not request-controlled application queries. Patch frontend tooling without a broad framework redesign.                                                                                                                                            |

## CodeQL Findings

Both alerts reference main `bc7eeaf...` with CodeQL 2.27.2. They remain open.

- [#1 CSRF](https://github.com/EdenCirakoglu/Client-Tracker/security/code-scanning/1):
  `app.ts` installs session and synchronizer protection before all auth/business
  routers. `csrf-sync` checks the session token and the wrapper checks Origin.
  The [upstream query](https://github.com/github/codeql/blob/main/javascript/ql/src/Security/CWE-352/MissingCsrfMiddleware.ql)
  factory list does not model `csrf-sync`. Existing 25-route negative cases and
  normal successful writes support a model-gap classification, alongside source
  review. Tests alone do not establish that classification. Re-review new routes.
- [#3 cookie](https://github.com/EdenCirakoglu/Client-Tracker/security/code-scanning/3):
  `session.ts` deliberately permits a non-Secure development/test cookie.
  In production it uses `Secure`, `HttpOnly`, `SameSite=Lax`, `/`, no Domain and
  the `__Host-` prefix. `env.ts` rejects non-HTTPS production origins. Existing
  browser account tests inspect the actual production-mode HTTPS cookie.
  This is a development-mode exposure/configuration-sensitive warning, not proof
  of a production leak. Do not expose the development server as a customer service.

Neither query is suppressed and no protection is changed to make a scanner pass.
Real trusted HTTPS, operator configuration and manual screen-reader acceptance
remain outstanding even when fixture browser checks pass.

## Next Review Boundary

Finish maintenance CI, attach its exact head/results and artifact links to the
PR, and review before merge. Subsequent product work belongs in a separate PR.
Only after an approved release merge should new main/publication results and
digest-pinned runtime checks be recorded. Booking, checkout, public staging and
real email need the explicit operator inputs in [ROADMAP.md](ROADMAP.md).
