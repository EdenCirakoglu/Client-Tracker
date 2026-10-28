# Delivery Journal Review

## Controlled Release Follow-up

Main was rechecked at `38b6ef17f2a2399c5d444da153081167e2b9feae` on October 28.
PR #20 is receiving an adapted security refresh without product-only schemas or
features. PR #22 remains stacked on the maintenance branch; it must not merge
there when the intended release target is main. After separately approved #20
merge, retarget #22 to main, reconcile duplicate security changes and regenerate
the lockfile, then obtain fresh actual-head CI and both CodeQL analyses again.

The owner approved protection against force pushes/deletion on the maintenance
branch so managed CodeQL can cover this stacked PR. Default setup, both languages
and existing alert classifications remain enabled. This documentation-only
checkpoint requests fresh analysis; the final PR handoff records its actual
result, not an inferred success from historical checks.

Preserve `2834effd8ec5890506dc707356bcbe467c9ad2d4` and its
[verified CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40688079673):
190 API tests, 28 helpers and 14 browser scenarios with no skipped, unexpected or
flaky browser results. Artifact SHA-256:
`feaab14ee1c8590a2ef8e4f5c1e617e96fc8ea5711ba15593ed44364c854e406`.
The external reviewer verified that archive and four screenshots, not the laptop
runtime or every changed line. No product behavior or historical capture is
changed by this checkpoint. Two esbuild dispositions remain proposed, unapproved,
due November 4 or first installation. Human screen-reader and real-service
acceptance remain outstanding. No merge or publication is authorized here.

## Historical Boundary and Provenance

Reviewed 2026-10-28 on `feature/agency-onboarding-notifications`.
[Draft PR #22](https://github.com/EdenCirakoglu/Client-Tracker/pull/22)
([files](https://github.com/EdenCirakoglu/Client-Tracker/pull/22/files)) remains
stacked on PR #20 at `27c7dbb35a7fa855a87ad7ae05ef5034a663c4ec`, itself targeting
main `70246650a1ef80096fe74b08213d62d19323e787`. Neither draft was merged.
After an approved #20 merge, retarget #22 to main, inspect the incremental diff,
and obtain fresh CI/CodeQL. No #20 CodeQL result substitutes for this product head.
The October 28 security patch currently belongs to #22, not #20. Do not treat #20's
older passing audit as current: review how to land that separate security commit
before authorizing a release. No CodeQL analysis for the stacked #22 head was
returned by the current checks API; fresh analysis remains a merge-review gate.

Historical PR #22 head `81012cb42a54a2bff8863cb5b11f07c893e8ee55`, its
[CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39632730129) and
artifact checksum `08a7c6657e2833645d6a90e1b4d74249f67c929950b6ff2d2c684697e19c2474`
remain unchanged evidence. This increment does not claim published-image,
external-service or customer acceptance.

## Changes and Contracts

- **Security maintenance, `0f567fd`:** owner-approved Zod 4 migration and compatible
  parser/address/Vitest patches. [Full inventory and remaining decisions](DEPENDENCY_REMEDIATION.md#current-recheck-2026-10-28).
  No new override, schema change, historical migration edit or audit suppression.
- **Correctness, `b05bf24`:** preserve an allowlisted internal path, query and anchor
  through login. Reject external/protocol-relative, malformed, normalized traversal,
  duplicate destination and login-loop values. Normal login still goes to dashboard;
  explicit logout goes to plain login. A link never grants record or decision access.
  Async record anchors receive keyboard focus once loaded.
- **Notification outcomes:** publication returns actual `queued`, `alreadyRequested`,
  `notQueued` counts plus recipient outcomes from inserts inside the transaction.
  A valid mixed new/existing selection queues only new keys. Any ineligible contact
  rejects the entire request with sanitized 400; publication and enqueue are unchanged.
  Previously accepted/failed/suppressed jobs are still already requested, not retried
  by publication. Administrator mail status separately reports queued/retrying,
  accepted by mail server, failed or suppressed. SMTP acceptance is not inbox delivery.
- **API/data:** bounded `view=mine` reuses the existing delivery plan, tenant scope,
  current revision rules, repeatable-read counts and stable ordering. Only the current
  designated client gets personal decisions. Organisation views remain separate.
  No new approval model or database migration. Staff delivery follow-up is explicitly
  team-wide; developer My work remains a separate personal ticket queue.
- **Visual slice, `326f97e`:** decisions/commitments first, compact secondary metrics,
  deep teal and neutral light/dark tokens, original request and independent ticket/
  delivery/acceptance facts, field-by-field stored revision comparisons, prominent
  decision snapshots and consolidated empty summary sections. All snapshot sections,
  attribution and exact UTC reporting periods remain available.
- **Onboarding:** accurately named Installation setup, with installation-wide counts;
  completed setup remains collapsed and reopenable. Projects already link to scoped
  delivery plans. A unified project overview joining requests, releases and agreements
  is a focused follow-up, not claimed here.
- **Account follow-up, `332258a`:** a reproduced password-change sign-in race is fixed
  by starting a fresh document after credential changes instead of reusing stale
  authenticated client state.

Deploy the matching web/API pair. Migration 0007 from the earlier product increment
adds workflow jobs: stop/drain writers before migration, retain restricted grants,
and never run older account-only workers against active `WORKFLOW` payloads. This
follow-up adds no migration. Recovery remains compatibility-aware repair-forward or
a separately rehearsed restore, not simply choosing an older image.

## Verification Records

| Revision                                   | Actual result                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0f567fd4cf8b71dbd2e64d1c00b180884281dbcc` | [Hosted CI passed](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40679536296), including retained operational checks. Security migration evidence only.                                                                                                                                                                                                                             |
| `326f97edbfe80336b6f5c09a456b60f3edcb752b` | Local lint/typecheck/format passed; 190 API tests across 21 files, 28 helper tests, both container builds and populated upgrade fingerprint preservation passed.                                                                                                                                                                                                                                   |
| `3761726f013aa1aa6029d59f25e4549384e30f87` | Focused captured-email browser scenario passed. Sixteen light/dark journal states passed axe and overflow checks. Native Chrome 200% zoom, mobile first action and keyboard checks passed. Application images contain unchanged `326f97e` code; intervening commits only change tests.                                                                                                             |
| `d3b66ab6b29bf29e492782ebb2eeeb024b84c261` | Clean local combined browser run: 14 passed, 0 failed/skipped/flaky (306.9 seconds). Lint/typecheck/format, native 200% zoom, keyboard/axe and report privacy checks passed. Runtime audit: zero known findings; full audit: two documented findings (exit 1). [Hosted run](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/40687006172), whose final result must be read separately. |

The final PR review comment records the final tested head, its CI/artifact links,
checksum and complete commit-pinned file inventory. Do not infer success for a new
head from the table above.

Failures are retained as findings: the first email test cleared cookies but performed
a hash-only same-document navigation; the corrected fixture opens a fresh document.
The combined browser run then reproduced the password-change routing race above.
Repeated capture/test runs exhausted the local auth limit; no protection or timeout
was relaxed. Combined runs must execute alone against the fixture. The full audit
still exits nonzero for two esbuild tooling advisories; owner approval is pending by
2026-11-04 or before customer installation. A clean production npm audit is not an
OS-package, application-logic, CodeQL or deployment security assessment.

## Exact Local Commands

Use Node 24, pnpm 9.15.4, Docker Linux containers and installed Chrome (or install
Playwright Chromium and omit `BROWSER_CHANNEL`). Run from `clientops-tracker` in
this branch's worktree. The named launch fixtures preserve their existing volumes;
do not run these mutation tests against customer or development data.

```powershell
pnpm install --frozen-lockfile
node scripts/hardening-stack.mjs start --launch
$env:TEST_PG_PORT="15436"
$env:TEST_SMTP_PORT="11028"
$env:TEST_MAIL_PORT="18028"
docker compose -p clientops-launch-product -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL="postgresql://clientops_test:disposable_test_password@127.0.0.1:15436/clientops_hardening_test"
$env:DISPOSABLE_DATABASE_NAME="clientops_hardening_test"
$env:SMTP_PORT="11028"
$env:MAILPIT_URL="http://localhost:18028"
pnpm lint
pnpm typecheck
pnpm test
pnpm test:verification
pnpm build
pnpm format:check
node scripts/check-migration-generation.mjs
pnpm audit --prod
pnpm audit
```

The last command intentionally reports the two documented tooling findings.
If a trusted local network CA is required, supply its private PEM path through
`NODE_EXTRA_CA_CERTS` and `BUILD_CA_FILE`; never disable registry TLS verification.
On Node 24, `$env:NODE_OPTIONS="--use-system-ca"` can use the installed trusted
system CA store. This resolved the local registry certificate-chain failure;
the failed connection itself was not counted as an audit result.

```powershell
$env:VERIFY_URL="https://localhost:8460"
$env:WORKFLOW_MAIL_URL="http://localhost:8040"
$env:ACCOUNT_SETUP_URL="https://localhost:8461"
$env:ACCOUNT_MAIL_URL="http://localhost:8041"
$env:E2E_ALLOW_DISPOSABLE_DEMO="true"
$env:BROWSER_CHANNEL="chrome"
$env:E2E_SCREENSHOT_DIR="test-results/journal-browser-screenshots"
pnpm test:e2e
$env:VERIFY_PROJECT="clientops-launch-demo"
$env:UI_EVIDENCE_DIR="test-results/journal-native"
node scripts/verify-ui-acceptance.mjs
node scripts/capture-delivery-journal.mjs
```

Preview: <https://localhost:8460>; fictional capture mail: <http://localhost:8040>.
These use a local self-signed fixture certificate, not trusted public HTTPS.
Browser report: `playwright-report/index.html`; structured results:
`test-results/browser-results.json`. Do not upload local reports containing personal
filesystem metadata; hosted CI runs the existing privacy gate before uploading.
The clean local `d3b66ab` run used `test-results/journal-browser-d3b66ab` for captures
and `test-results/journal-native-d3b66ab/acceptance.json` for native zoom results.

The combined 14-scenario suite exceeded the unchanged 300 auth requests/IP/15 minutes
at revision `0ba6079` (13 passed, final email-navigation scenario returned 429). That
scenario now uses an explicit `hardening-stack.mjs restart-demo-api` boundary on the
named disposable fixture. It retains database records and persistent route limits,
asserts that both pre-restart sessions still work, and then runs every navigation
assertion once. It does not raise limits, reset databases or retry failed assertions.

## Matched Capture Conditions

The screenshot index below preserves fictional records, not reset data. Before:
`81012cb42a54a2bff8863cb5b11f07c893e8ee55` application images, with an untracked
capture helper. After: clean `326f97edbfe80336b6f5c09a456b60f3edcb752b` build.
Same users, shipment-reference ticket, scope/outcome revision 2, immutable summary,
1440 x 1000 desktop and 390 x 844 mobile viewports; full-page PNGs, animations off.
The eight matched light pairs and eight after-dark captures were visually inspected.
No clipped mobile decision heading was reproduced. The repeat-publication booleans
in the capture fixture describe the original baseline response, not the fixed API.
Current notification outcomes are asserted separately by API/browser tests.

Native zoom was changed in Chrome Settings, not CSS/device emulation: DPR 1 to 2,
inner width 1422 to 711, outer width 1440 unchanged. Ticket-review focus remained
below the header. Screen-reader acceptance is **not performed**.

## Screenshot Index

Eight matched pairs, not duplicate exports. The separate dark column is an intentional theme check.

| Scenario / viewport | Before (81012cb)                                                                     | After (326f97e)                                                                    | Dark after (326f97e)                                                             |
| ------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| admin-home-1440     | [Before](assets/screenshots/journal-2026-10-28/before/admin-home-1440-light.png)     | [After](assets/screenshots/journal-2026-10-28/after/admin-home-1440-light.png)     | [Dark](assets/screenshots/journal-2026-10-28/after/admin-home-1440-dark.png)     |
| developer-home-1440 | [Before](assets/screenshots/journal-2026-10-28/before/developer-home-1440-light.png) | [After](assets/screenshots/journal-2026-10-28/after/developer-home-1440-light.png) | [Dark](assets/screenshots/journal-2026-10-28/after/developer-home-1440-dark.png) |
| client-home-1440    | [Before](assets/screenshots/journal-2026-10-28/before/client-home-1440-light.png)    | [After](assets/screenshots/journal-2026-10-28/after/client-home-1440-light.png)    | [Dark](assets/screenshots/journal-2026-10-28/after/client-home-1440-dark.png)    |
| client-home-390     | [Before](assets/screenshots/journal-2026-10-28/before/client-home-390-light.png)     | [After](assets/screenshots/journal-2026-10-28/after/client-home-390-light.png)     | [Dark](assets/screenshots/journal-2026-10-28/after/client-home-390-dark.png)     |
| client-ticket-1440  | [Before](assets/screenshots/journal-2026-10-28/before/client-ticket-1440-light.png)  | [After](assets/screenshots/journal-2026-10-28/after/client-ticket-1440-light.png)  | [Dark](assets/screenshots/journal-2026-10-28/after/client-ticket-1440-dark.png)  |
| client-ticket-390   | [Before](assets/screenshots/journal-2026-10-28/before/client-ticket-390-light.png)   | [After](assets/screenshots/journal-2026-10-28/after/client-ticket-390-light.png)   | [Dark](assets/screenshots/journal-2026-10-28/after/client-ticket-390-dark.png)   |
| client-summary-1440 | [Before](assets/screenshots/journal-2026-10-28/before/client-summary-1440-light.png) | [After](assets/screenshots/journal-2026-10-28/after/client-summary-1440-light.png) | [Dark](assets/screenshots/journal-2026-10-28/after/client-summary-1440-dark.png) |
| client-summary-390  | [Before](assets/screenshots/journal-2026-10-28/before/client-summary-390-light.png)  | [After](assets/screenshots/journal-2026-10-28/after/client-summary-390-light.png)  | [Dark](assets/screenshots/journal-2026-10-28/after/client-summary-390-dark.png)  |

## Manual Acceptance and Remaining Owners

Reviewer: with NVDA/VoiceOver, follow a captured review link signed out; verify login
labels/errors, the returned section announcement/focus, field-by-field revision order,
decision controls, feedback and persisted confirmation. Repeat at mobile width and
200% zoom; test summary empty-section disclosure, theme picker and keyboard navigation.
Record actual assistive technology/version, tester, date and failures before acceptance.

Maintainer: review the two tooling decisions, then the stacked PRs in order. After
approved merges, verify actual main CI/publication and digest-pinned image runtime.
Operator: trusted domain/HTTPS renewal, independent secrets, authenticated SMTP and
approved recipients, off-host encrypted backup/restore, alerts/monitoring, retention,
recovery owner/RTO/RPO and support arrangements still require real-service acceptance.
Owner: genuine booking/checkout, approved price/terms and pilot handoff remain pending.
No real email, public deployment, payment activation or release publication occurred.

Next smallest product increment: a scoped project overview linking the existing
request/agreement/commitment/release/acceptance records, after this review and manual
acceptance. Attachments, reminders, saved views, billing and SaaS tenancy changes remain deferred.
