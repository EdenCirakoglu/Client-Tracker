# First-Customer Candidate: November 10

## Provenance and Boundaries

- Published main: `cfec6e71a51975e224a2cee9ddda2238183b8b31`.
- #22: `9e25bc27d73ae1756c8fc185223704417de8642b`, base main; normal CI passed
  ([42499222820](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42499222820)).
  CodeQL execution succeeded but [policy failed](https://github.com/EdenCirakoglu/Client-Tracker/runs/128788230364).
- #34: `a6a343cb9f9d278dadf9377f26d6b96d2dd90eb9`, base #22; normal CI passed,
  no applicable CodeQL analysis reported at this head. Missing analysis is not success.
- This increment: `feature/first-customer-guidance`, base **a6a343cb9f9d278dadf9377f26d6b96d2dd90eb9**.
  Separate API, UI/test and operator/human-handoff commits; no migration/dependency
  changes. The final PR handoff pins the tested head/checks/artifact and file inventory.
  Historical results in parent reports retain their original revisions.

No merge, alert disposition, checkout activation, public deployment, real email or
customer contact is authorized/performed. The existing public fictional walkthrough
was fetched read-only (HTTP 200); HTML SHA-256
`219a647c8804f9712f23092f275b9d0f93db4de0973f99b11c0e909b5a5b942c`.
It is not the writable portal. The logo and historical screenshots are preserved.

## Released Versus Candidate

| Claim                                                                                                                         | Where it exists                                      | Evidence / limitation                                                                                                   |
| ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Authenticated client/project/ticket/comments, rule-based triage, scope revisions, delivery acceptance, summaries and planning | Published cfec6e71 source/images                     | Main CI and release report below. This bounded image rehearsal tests representative records, not every browser journey. |
| Workflow notification outbox, truthful queue outcomes, personal decisions, email return destinations and journal refinements  | #22 candidate                                        | Parent normal CI; unresolved CSRF policy. Not in cfec6e71 published images.                                             |
| Exact v3 journal mark and fictional walkthrough draft                                                                         | #34 candidate; independent public static walkthrough | Branding CI, no application deployment claim.                                                                           |
| Selected-client setup, Start here, contextual links and next-actor help                                                       | This candidate                                       | Scoped API regressions and fresh-account browser scenario; final-head CI evidence in PR handoff.                        |
| Decision Journal concept artwork, project-overview redesign, printable receipt                                                | Concepts/backlog                                     | Not advertised as running features. No duplicate approval system.                                                       |

## New Published-Image Rehearsal

Main CI [42269883427](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42269883427)
and publication [42273339327](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42273339327)
were rechecked: both API/web jobs succeeded for cfec6e71.

- API digest: `sha256:be22ef9713ce2f61816828900aff2aacc423dc8e0a74d1621cd5709941163d22`.
- Web digest: `sha256:21f48c3107310bfd644a41b284825b62449b09ee23c06d03ffd4486230b9a96a`.
- Both OCI revision labels match cfec6e71; pulled, **not rebuilt**.
- New project `clientops-published-cfec6e71a519-customer-20261110`, volume/subnet
  separate from all existing installations. Port 8482, subnet 10.240.70.0/24.
- Passed migrations/populated idempotence, HTTPS startup/readiness, Secure/HttpOnly/
  SameSite login, ticket/public/internal comments/status, tenant denial, CSRF,
  PostgreSQL outage (liveness 200, readiness/auth 503), recovery, full recreation
  fingerprint/session persistence and logout replay rejection. Exit 0.
- Business fingerprint `89d8914863ba9f8a9aae4d1155b68044c49f6e7b28ea7f5d30bcd822c90256e1`.
  Delivery/scope/summary tables were empty in this maintenance-image rehearsal.
  Candidate decision persistence is tested separately, not inferred from that hash.
- Report: `test-results/clientops-published-cfec6e71a519-customer-20261110/verification.json`.
  Harness SHA-256 `d927b26ee9558eca4e1afd426b94773bd733008da146b29bc2ce257ea44252d4`.
  November 8 [release evidence](RELEASE_CFEC6E71.md) is unchanged.

```powershell
$env:RELEASE_INSTANCE='customer-20261110'
$env:RELEASE_HTTPS_PORT='8482'
$env:RELEASE_SUBNET='10.240.70.0/24'
$env:RELEASE_HTTPS_TRANSPORT='container'
node scripts/verify-registry-release.mjs cfec6e71a51975e224a2cee9ddda2238183b8b31 sha256:be22ef9713ce2f61816828900aff2aacc423dc8e0a74d1621cd5709941163d22 sha256:21f48c3107310bfd644a41b284825b62449b09ee23c06d03ffd4486230b9a96a
```

The harness refuses an existing volume. For another fresh rehearsal choose a new
instance/port/unused subnet; do not reset the preserved one.

## Observed UI and Changes

Before edits, fresh fictional developer/client accounts were invited and activated
through Mailpit on a new empty-business-data stack. Actual 1440x1000 and 390x844
screens were captured and inspected, including the existing delivery controls.
The initial administrator capture included transient loading indicators and is not
presented as a fully loaded empty-state result. Developer/client captures settled.

Confirmed gaps: installation-wide steps cannot show one client's readiness; the
no-project request warning was below a fillable form; there was no consistent
reopenable role guide; delivery waiting/feedback states did not clearly name the
next actor. This increment fixes those, preserving existing audience selectors,
reviewer controls, revision history, immutable summaries and security boundaries.

Correctness/API: a bounded ADMIN-only, repeatable-read scoped setup endpoint joins
each project/account/request/decision to the selected client and rechecks the actor.
Invitation delivery metadata is separate from active reviewer eligibility. No
passwords, token hashes, payloads or mail bodies enter this response.

UI: Start here in navigation/dashboard, selected-client links to prefilled forms,
project success feedback, top-of-form project prerequisite and delivery next actor.
Help stays secondary/reopenable. Existing teal identity, themes and independent
ticket/release/acceptance states remain. No mandatory tour or new dashboard.

## Claims to Exercise

| Advertised claim                          | Role              | Steps                                                         | Expected result                                  | Exact test/evidence                                                  | Gap                                   |
| ----------------------------------------- | ----------------- | ------------------------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------------------- | ------------------------------------- |
| Set up one client                         | Admin             | Select Harbor; create its project; invite Nina                | Canal cannot complete Harbor's steps             | `client-onboarding.test.ts`; `first-customer.spec.ts`                | Independent first-visit study pending |
| Invitation is not activated access        | Admin/client      | Queue mail; inspect; accept link                              | No eligible reviewer until active; SMTP != inbox | Same scoped/browser tests; account suite                             | Actual inbox receipt pending          |
| Deliver a change for review               | Developer         | Assigned work, outcome agreement, same-project release, notes | Client acts next, ticket status independent      | `product-workflows.spec.ts`; `first-customer.spec.ts`                | Real agency usage pending             |
| Decide from an email                      | Designated client | Signed-out email, sign-in, record decision                    | Exact record/anchor, persisted decision          | `workflow-notifications.spec.ts`; `first-customer.spec.ts`           | Public SMTP not exercised             |
| Revised work needs fresh agreement        | Staff/client      | Revise approved scope/outcome                                 | Old decisions retained, new revision undecided   | `product-workflows.spec.ts`; workflow API suites                     | Human comprehension pending           |
| Acceptance differs from requested changes | Client            | Separate all-met/failing cases                                | ACCEPTED vs CHANGES_REQUESTED after relogin      | `first-customer.spec.ts`                                             | Independent novice task pending       |
| Client privacy and reviewer authority     | All               | Other-org URL/API, other contact decision, export             | 404/403, no internal details                     | Same new browser scenario; existing boundary/mail/export regressions | Security policy disposition separate  |
| Client-readable published summaries       | Staff/client      | Preview, publish, read snapshot                               | Draft private; immutable, no internal preview    | Product/workflow browser/API suites                                  | Human briefing evaluation pending     |

## Repeatable Local Commands

From the isolated checkout's `clientops-tracker` directory, use Node 24, pnpm 9.15.4,
Docker Linux engine and installed Chrome (or Playwright Chromium). No personal
browser profile is used. `--customer` names new projects/volumes and preserves them
on later starts; it seeds only a new explicitly disposable demo, never the empty
account-setup workspace or production.

```powershell
pnpm install --frozen-lockfile
node scripts/hardening-stack.mjs start --customer
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8480'
$env:VERIFY_PROJECT='clientops-customer-demo'
$env:ACCOUNT_SETUP_URL='https://localhost:8481'
$env:ACCOUNT_MAIL_URL='http://localhost:8061'
$env:WORKFLOW_MAIL_URL='http://localhost:8060'
$env:BROWSER_CHANNEL='chrome'
pnpm test:e2e
node scripts/verify-ui-acceptance.mjs
```

Preview: `https://localhost:8480` with labelled disposable role buttons. Fresh-account
workspace: `https://localhost:8481`, owner `owner@accounts.example`, fixture-only
passphrase `Local-owner-passphrase-42`. Mail capture: localhost:8060/8061. The self-signed
exception is only for this loopback fixture, not staging. Reopen Start here; sign out
before switching roles. These known fixture credentials must never leave disposable mode.

This host's default Docker network pool was exhausted. New dedicated networks used
10.240.71.0/24 (demo) and 10.240.72.0/24 (accounts), not removal of old networks.
An optional private build CA was supplied via `BUILD_CA_FILE` for this host's TLS
inspection; it is not committed or baked into the runtime. Existing databases survive.

```powershell
$env:TEST_PG_PORT='15450'
$env:TEST_SMTP_PORT='11050'
$env:TEST_MAIL_PORT='18050'
docker compose -p clientops-customer-api-tests -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@localhost:15450/clientops_hardening_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_hardening_test'
$env:SMTP_MODE='capture'
$env:SMTP_HOST='localhost'
$env:SMTP_PORT='11050'
$env:MAILPIT_URL='http://localhost:18050'
pnpm lint
pnpm typecheck
pnpm test
pnpm test:verification
pnpm build
pnpm format:check
node scripts/check-migration-generation.mjs
node scripts/check-packaged-api.mjs
node scripts/secret-scan.mjs
pnpm audit --prod
pnpm audit
```

On this machine a private network override added 10.240.73.0/24 to that test Compose
command. Test data is disposable/tmpfs; test configuration never falls back to demo.
Reports: `test-results/browser-results.json`, `playwright-report/index.html`,
`test-results/first-customer/customer-*.png`, `test-results/ui-acceptance/acceptance.json`.
Final checked revision/check URLs are recorded in the PR handoff; earlier intermediate
runs are not silently attributed to the final commit. Local Windows logs stay local;
public browser artifacts come from the privacy-gated Linux CI checkout.

## Security and Acceptance Decisions

- Alert [#1](https://github.com/EdenCirakoglu/Client-Tracker/security/code-scanning/1),
  `js/missing-token-validation`, high, at session middleware: global synchronizer-token
  guard precedes unsafe API routes. Missing, invalid, cross-session and foreign-origin
  proof are rejected; valid proof still needs role/tenant/reviewer permission.
  Fourteen focused scoped-setup/CSRF tests passed locally at the implementation
  checkpoint. [Independent review](CSRF_REVIEW.md) remains required; no disposition
  or bypass is inferred from CI success. The new endpoint is a read-only GET.
- Alert [#3](https://github.com/EdenCirakoglu/Client-Tracker/security/code-scanning/3),
  `js/clear-text-cookie`, separate: production Secure/HttpOnly/SameSite cookies are
  exercised over local HTTPS; development HTTP differs. Independent reviewer decides.
- Production npm audit: zero. Full audit: **two moderate findings**, not suppressed:
  `apps/api -> drizzle-kit@0.31.11 -> @esbuild-kit/esm-loader@2.6.5 ->
@esbuild-kit/core-utils@3.3.2 -> esbuild@0.18.20`
  ([GHSA-67mh-4wv8-2f99](https://github.com/evanw/esbuild/security/advisories/GHSA-67mh-4wv8-2f99),
  patched >=0.25); and root `typescript-eslint@8.61.0 -> typescript-estree@8.61.0 ->
minimatch@10.2.5` (including plugin/parser paths),
  [GHSA-g3hv-75wg-m249](https://github.com/isaacs/minimatch/security/advisories/GHSA-g3hv-75wg-m249),
  patched >=11.0.1. Development tooling, not published runtime dependency proof.
  Do not expose esbuild serve/Studio or run untrusted lint globs. Supported parent
  remediation or an explicit scoped owner decision is still needed. Eden owns both;
  the Kit November 4 deadline is overdue, **not extended or accepted**. Review now,
  before staging/customer installation. No broad upgrade in this usability increment.
- Historical October invitation/restart failure remains unexplained; strict subsequent
  passes do not establish its cause. Prior evidence and diagnostics remain intact.
- Human screen-reader and independent first-visit acceptance: **not performed**.
  [Task card](FIRST_CUSTOMER_TASK_CARD.md) and separate [key](FIRST_CUSTOMER_TASK_KEY.md).
- Real staging: **not accepted**. Trusted public HTTPS/renewal, real inboxes, off-host
  restore, actual alert receipt, independent monitoring, support and recovery owner
  must pass on the intended host. Local fixtures are not those services.

Ready for private online staging: **no**, pending security/owner decisions and private
operator inputs. Safe loopback rehearsal: yes. Ready for supervised agency pilot: **no**,
pending staging and approved scope/support. Ready for customer production: **no**,
pending all acceptance gates and an approved published candidate. Next owner action:
assign/obtain the independent CSRF and cookie review; do not dismiss alerts solely
to unblock publication. Continue local review without exposing a writable service.
