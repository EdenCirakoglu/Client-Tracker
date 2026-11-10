# Meridian Ticket Review

## Candidate and Boundary

Review-only implementation of the supplied Meridian Master Prompt, with the user's
lighter-charcoal correction. [Draft PR #37](https://github.com/EdenCirakoglu/Client-Tracker/pull/37)
([complete diff](https://github.com/EdenCirakoglu/Client-Tracker/pull/37/files)) depends on #36.

- Branch: `feature/meridian-ticket-review`.
- Initial inspected base: `a227b164dbec2ab921425d49fa11ae4a770eaf2e`.
- Reconciled parent: `23484934143dc4f885d70b34a172337053fd8d61`, `feature/logo-intro`.
- Implementation checkpoint: `0a4be4576b4d6187f8652fe2fde96eaec79075cc`.
- Parent's intervening change only configures reduced motion in ordinary browser
  tests and opts the existing logo-intro tests back into full motion. Its history
  is preserved by a merge into this isolated feature branch, not a PR merge.
- No API routes, database schema, migrations, authentication, authorization,
  worker configuration, public walkthrough or logo assets changed.

The initial combined hosted run at the implementation checkpoint failed: three
old checks selected every header rather than the application header, an outcome
label became more specific, and a repeated decision label needed an explicit
heading target. The ticket context now follows the existing non-banner PageHeader
convention; delivery state is a real heading and the affected assertions still
check the same records and persisted decisions.

Later cases in that run received the existing auth-ingress response, "Too many
attempts. Please wait before trying again." The enlarged automation exceeded the
300-request/15-minute ingress budget from one IP. CI now runs the 18 existing
business/account scenarios and the 14 logo/Meridian scenarios in separate jobs,
each with a fresh isolated stack. All 32 cases remain included. No auth limit,
CSRF guard, timeout, assertion or retry policy was relaxed; no limiter is cleared
inside a journey. Both job results are required for a successful workflow.
The failed checkpoint remains historical evidence, not a passed combined run.

After separately approved parent merges, retarget this PR to actual main, inspect
the incremental diff and rerun CI. No merge, image publication, public deployment,
real email, payment activation or risk acceptance is included.

## Working Design

The existing AppShell, role navigation, logo, account controls, light/dark/system
preference, cards, forms and Lucide icons remain. The new dark canvas is charcoal
`#1d2120`, with `#252b29` panels, not the near-black concept background.
Instrument Serif is limited to display headings; Geist serves controls and body
text; JetBrains Mono labels revisions. Fonts are self-hosted, with upstream notices
in `apps/web/public/THIRD_PARTY_NOTICES.txt`; no third-party font requests are needed.

Ticket review now has:

1. A real ticket title and compact owner/project/status context; the original
   request remains available in a disclosure. Existing email section anchors work.
2. A Revision River containing only stored scope revisions and the original
   captured request. Select with buttons, arrow/Home/End keys or the range control.
   The selected node stays visible when the viewport changes.
3. Validated `from`/`to` URL selections, preserved through reload/back/forward.
   Scope comparisons require an earlier stored proposal; the original request
   is not silently treated as an agreed scope.
4. Bounded jsdiff word comparisons with semantic insertions/deletions, text labels,
   side-by-side/inline modes and an unchanged-fields disclosure. Long/adversarial
   inputs fall back to complete field replacement, never truncated evidence.
5. A full-width read-only comparison at `/tickets/:id/compare?from=1&to=2`.
6. A current-revision decision panel and accessible native modal review sheet.
   Approval requires a review checkbox. Changes/decline require a meaningful
   reason. Failed saves retain feedback; stale submissions retain the reviewed ID
   and are rejected by the existing server. Reload is explicit.
7. Saved decision attribution and history from the API. Staff and non-designated
   contacts cannot act as the approver. Double submission has a synchronous guard.
8. Separate ticket-status, delivered-release and client-acceptance facts. Existing
   outcome agreement, delivery review, export, comment audience and triage remain.

The reference's invented draft, SLA pulse, signature hash, notification count,
workspace switching and phrase-level comments are **not** represented as shipped
features. No client decision is simulated in localStorage. No universal completion
percentage or automatic acceptance is added. Broader dashboard/summary redesign
is outside this ticket-first increment.

## Local Verification

Checks performed on this implementation and its reconciled checkpoint:

| Check                                                  | Actual result                                                                         |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                       | Passed; no lockfile regeneration                                                      |
| `pnpm lint`, `pnpm typecheck`                          | Passed                                                                                |
| `pnpm test`                                            | 205 API tests passed, 23 files, separate disposable DB                                |
| `pnpm test:verification`                               | 34 helper tests passed, including four new diff/URL regressions                       |
| `pnpm build`                                           | Both API and Next.js production builds passed                                         |
| `pnpm format:check`, `git diff --check`                | Passed                                                                                |
| `node scripts/check-migration-generation.mjs`          | No migration changes, historical files checked in a temporary copy                    |
| `node scripts/secret-scan.mjs`                         | Successful reachable-history scan; no leaks found under existing narrow fixture rules |
| `pnpm audit --prod`                                    | No reported vulnerabilities                                                           |
| `pnpm audit`                                           | Exit 1: two inherited moderate tooling findings, listed below                         |
| `pnpm test:e2e e2e/meridian-review.spec.ts`            | 3/3 passed together on production preview at checkpoint; no retries/skips             |
| `node scripts/verify-meridian-zoom.mjs`                | Native Chrome 200% zoom, keyboard and axe passed in both themes                       |
| Human screen reader / independent first-time usability | Not performed; acceptance pending                                                     |
| Published images / real staging                        | Not reverified or deployed in this UI increment                                       |

New browser coverage includes exact-revision approval, reload/re-login persistence,
a newer proposal appearing during review, requested changes, invalid feedback,
an injected one-time 503 with retained input, concurrent submit clicks, staff
read-only approval controls and another organisation's direct page/API denial.
The existing full workflow and email scenarios now use the confirmation sheet
without removing their history, notification or privacy assertions.

Responsive checks use 390x844, 768x1000, 1280x1000 and 1440x1000, both themes.
Native Chrome zoom changed CSS width from 1422 to 711 and device pixel ratio from
1 to 2; this is not CSS zoom or viewport emulation. Clean-checkpoint result:
`test-results/meridian-zoom/acceptance.json`.
Playwright output: `playwright-report/`, `test-results/results.json`;
screenshots: `test-results/meridian-evidence/`.

Implementation-stage failures were investigated, not hidden: selecting the original
request as the implicit scope baseline was corrected; resize could leave the current
River node off-screen and now has a direct regression; a manual secondary-account
fixture initially typed into the inert login form during the logo intro and now
waits for that modal to close. No timeouts, assertions or API permissions were weakened.

## Reproduction

Requirements: repository-pinned Node 24 and pnpm 9, Docker Desktop's Linux engine,
installed Chrome for the local channel, fictional demo users on an explicitly
disposable database. Never run the test suite against development/customer data.

From `clientops-tracker`, the retained private preview is
`http://localhost:3081` with API `http://localhost:8086`.
The separate new Compose project is `clientops-meridian-preview`; its volume is
`clientops-meridian-preview_meridian_data`. Demo and test databases are respectively
`clientops_meridian_demo` and `clientops_meridian_test`, on loopback port 15461.
Existing development, customer, logo and registry-verification databases were not reset.

```powershell
# Reopen this run's ignored, local-only preview launchers if stopped.
powershell -NoProfile -ExecutionPolicy Bypass -File test-results/meridian/start-api.ps1
# In a second terminal:
powershell -NoProfile -ExecutionPolicy Bypass -File test-results/meridian/start-web.ps1
```

These launchers are retained only in the review worktree, not a portable installation
artifact. For a fresh machine/clean CI checkout, the existing
`node scripts/hardening-stack.mjs start` creates the documented production-style
fixtures at https://localhost:8443 and :8444. First confirm those named fixtures
are not already in use: do not reset an existing verification installation.

```powershell
$env:VERIFY_URL = 'http://localhost:3081'
$env:VERIFY_API_URL = 'http://localhost:8086'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
pnpm test:e2e e2e/meridian-review.spec.ts
$env:MERIDIAN_TICKET_ID = '87868da7-d5ec-498f-8cee-739e36b5d968'
node scripts/verify-meridian-zoom.mjs
pnpm test:verification
```

The zoom fixture expects an undecided scope assigned to the seeded client. Do not
approve the retained preview record before that check; the browser suite creates
separate fictional records for its mutations. Fresh machines must use the ID
printed/created by their own fixture. For the full same-origin Compose browser
suite, set VERIFY_URL to its HTTPS URL, remove VERIFY_API_URL, and use the existing
account/mail fixture configuration in `.github/workflows/ci.yml`.

API regression invocation used the explicitly disposable test database:

```powershell
$env:TEST_DATABASE_URL = 'postgresql://clientops_meridian:disposable_meridian_password@localhost:15461/clientops_meridian_test'
$env:DISPOSABLE_DATABASE_NAME = 'clientops_meridian_test'
$env:SMTP_MODE = 'capture'
$env:SMTP_HOST = 'localhost'
$env:SMTP_PORT = '11061'
$env:MAILPIT_URL = 'http://localhost:18061'
pnpm test
```

Those are fixture credentials, never customer configuration. Mail remains local.
Production build used `NEXT_PUBLIC_API_URL=http://localhost:8086` for this preview
only. Windows registry TLS used `NODE_OPTIONS=--use-system-ca`, not disabled TLS.

## Review the Preview

Sign in with **Continue as Client**, then visit
`/tickets/87868da7-d5ec-498f-8cee-739e36b5d968#scope`.

- Compare R1 (active shipments) with R2 (active and archived); expand unchanged fields.
- Move backwards with keyboard or slider, reload a comparison URL, then return current.
- Open **Approve revision 2**, inspect the exact terms, use Escape, then reopen.
- For a mutating rehearsal, use a separate fixture ticket; check **Request scope changes**
  feedback after reload and re-login. The main demo is left pending for repeated review.
- Switch to **Developer** to inspect proposal editing and the read-only client decision.
- Open **Outcome and delivery**: scope approval, delivery, ticket resolution and
  acceptance must not be confused.

Human screen-reader task (pending): with NVDA/Firefox or VoiceOver/Safari, read the
ticket heading and status, navigate to River, use arrow/Home/End, announce the selected
revision and diff added/removed text, open approval, confirm dialog name and focus trap,
toggle review, enter feedback, cancel and verify return focus. On a separate case,
save and confirm the announced outcome. Record AT/browser versions and actual speech.
Automated axe does not substitute for this.

## Evidence and Remaining Gates

Matched captures and hashes are in
[the screenshot manifest](assets/screenshots/meridian/README.md).
[Design QA](../design-qa.md) records intentional differences from the concept.

Checkpoint CI: [42919802757](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42919802757).
This is a checkpoint, not a claim about a later documentation head. The PR handoff
links the actual final-head run and artifacts separately.

Remaining inherited audit paths, not risk acceptance:

- `apps/api > drizzle-kit@0.31.11 > @esbuild-kit/esm-loader@2.6.5 > @esbuild-kit/core-utils@3.3.2 > esbuild@0.18.20`:
  [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99).
- `typescript-eslint@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5`
  (several duplicate wrapper paths):
  [GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249).

Owner: maintainer/security reviewer. The previously recorded Kit deadline remains
expired and unapproved. Retain the parent [CSRF review](CSRF_REVIEW.md) and separate
cookie finding; absent stacked-branch CodeQL coverage is not a passed policy result.
Production npm audit does not cover OS packages, application logic or configuration.
Human AT acceptance, parent release/security decisions and real TLS/SMTP/restore/
monitoring/alert acceptance remain separate launch gates. Next smallest action:
review this ticket-first slice, not merge or deploy it.
