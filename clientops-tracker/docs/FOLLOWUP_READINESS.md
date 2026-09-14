# Usability and Operator-Control Review

[Draft PR #5](https://github.com/EdenCirakoglu/Client-Tracker/pull/5) starts from merged `7eba339b37a2aa948ef4f6ed019d268816d4ec99`. It must remain unmerged. No DigitalOcean workflow, public deployment or follow-up image publication was performed.

The published release and its registry digests are independently verified in [RELEASE_7EBA339.md](RELEASE_7EBA339.md). Older evidence remains attached to its original SHA. New local/CI builds below are not published images.

## Review Boundaries

| Change                     | Files and purpose                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Published release evidence | `scripts/verify-published.mjs`, `verify-release-persistence.mjs`, release document: exact pulled digests, in-image migrations, nine browser journeys, readiness/mail recovery and recreation persistence      |
| Account usability          | `components/account-form.tsx`, `ui/password-input.tsx`, login page: outcome headings, generic recovery instructions, explicit password actions/Cancel/session warning, accessible visibility and field errors |
| Ticket usability           | Ticket list/detail pages: compact mobile filter disclosure with URL/history/reset preserved; explicit Reply to client/Internal note audiences and named save/delivery feedback                                |
| Database permissions       | `db/provision-roles.ts`, `runtime-grants.ts`, `check-runtime-role.ts`, migration/server entry points and Compose jobs: runtime DML, separate migration ownership, read-only backup role, stale-grant removal  |
| Operations                 | `ops/`, operations Compose, verification helpers: encrypted backups/retention, maintenance timers, readiness/mail/backup/certificate alerts, populated restore, executable pinned rollback                    |
| Regression and delivery    | Existing API/security/history/triage/browser coverage retained; focused account/mobile tests, SQL denials, Linux secret ownership, schedule checks and rollback gates added to root CI                        |

The teal design, role dashboards, existing ticket density, session/RBAC boundaries and transactional triage remain intact. No new business API route or schema migration is required by this follow-up. Privilege conversion is an explicit one-shot operational step, not an automatic startup mutation.

## Confirmed Findings

- Fresh published-image captures reproduced the incorrect reset-success heading and the 390x640 ticket filter obstruction before UI changes. The first useful ticket action now appears with status/priority above the fold when filters are collapsed. Expanded filters remain intentional, keyboard operable and URL-backed.
- Password success says **Password updated**, with Sign in. Recovery-request text does not reveal account existence and explains newest-link expiry, spam-folder and administrator next steps. A used/expired invitation shows **Link unavailable**; invalid credentials remain associated with their fields.
- Internal users choose **Reply to client** or **Internal note**; the submit action matches that audience. Clients have only the public reply action. The backend still excludes internal comments/events/triage and foreign organisations.
- Screenshot review also caught the composer silently resetting to public after an internal note. Submission now clears only the message; it preserves the selected audience until the user changes it or opens a new detail page. A browser assertion guards this behaviour.
- Role provisioning retains populated records, removes stale direct grants and rejects elevated runtime identities. The backup role cannot update tickets; runtime cannot create tables, truncate, delete business records, edit history/bootstrap state or assume the migrator role.
- The first two hosted attempts failed at encrypted repository initialisation, after browser/zoom/outage gates passed. A Linux dummy-file reproduction confirmed UID-1001/mode-600 files were unreadable by UID 0 with all capabilities dropped. A networkless fixture initializer now creates root-owned private secret-volume files. Production restrictions were not loosened.
- Legacy rollback installs a case-insensitive account-maintenance gate before changing images. It blocks direct API port publication, stops standalone workers and reports readiness as unavailable for the older release; login and ticket/comment work still operate. No JWT-era fallback is accepted.

## Revision-Specific Results

Implementation revision **`cf6d0f4518a66df9110e6b9891d21c07309631ca`** passed the complete [hosted CI run 34858027875](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34858027875). Checkout logs and report provenance both identify that exact head with a clean working tree. The subsequent evidence-only commit retains these results under their tested revision; its own final-head CI is linked in [PR #5](https://github.com/EdenCirakoglu/Client-Tracker/pull/5). Do not infer an overall CI pass from a successful browser stage.

| Evidence                                                                 | Actual result                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Published `7eba339`                                                      | Nine browser/axe scenarios, DB/SMTP outage recovery, two-organisation boundaries and recreation persistence passed locally using published digests, no rebuild                                                                                                                                                                                                           |
| Hosted clean `cf6d0f4`                                                   | All gates passed: secret scan, lint, typecheck, formatting, migration, 75 API tests, 10 verification-helper tests, both builds, Compose validation, restricted SQL privileges, 10 browser scenarios, native zoom, DB/SMTP outages, encrypted backups/alerts, schedule validation, populated restore and pinned rollback. Browser run: 64.26s, zero failed/skipped/flaky. |
| Local `cf6d0f4` portal regression                                        | Administrator/developer/client ticket and comment journey passed after rebuilding the local preview; 51.1s runner time. The only uncommitted changes were evidence files, so this is not labelled a clean-checkout full-suite run.                                                                                                                                       |
| Local API regression                                                     | 75 tests passed using separate `clientops-followup-tests` PostgreSQL/Mailpit services; never the demo database                                                                                                                                                                                                                                                           |
| Local browser `af44f18cbf031ab90f82a14808b8351633cace20`                 | Ten scenarios, zero failed/skipped/flaky; keyboard/axe and native Chrome 200% zoom passed; clean checkout                                                                                                                                                                                                                                                                |
| Local privilege check at `af44f18`                                       | Six forbidden SQL operations denied; stale grants removed; backup read-only; ticket fingerprint unchanged                                                                                                                                                                                                                                                                |
| Local controls at `af44f18` plus then-uncommitted `c05b433` fixture fix  | Encrypted readback, wrong key rejection, retention, readiness/mail/backup/certificate failure detection and six local capture webhooks passed                                                                                                                                                                                                                            |
| Local outage/restore at clean `c05b43315fe1b1fc964041a3f59471e742a58d82` | Readiness 503 in 773ms; authenticated request 503 in 2025ms; liveness 200; recovery 200. SMTP retry/restart/concurrent worker and stale-link rejection passed. Eight business tables preserved through encrypted restore; source unchanged, sessions/links invalidated, login/tenant denial and pinned rollback passed                                                   |
| Public services                                                          | Not deployed; no external S3, SMTP, alert recipient or real-domain certificate issuance/renewal tested                                                                                                                                                                                                                                                                   |

Local restore dump SHA-256: `676ed72b49ba48ca5e1b611e0f1cb4a028b359633f0c9c537ddc4bcc7165f461`. The dump itself is private and excluded. Snapshot/readback took 5642ms; restored startup took 34067ms for this small fixture, not a production RTO. Daily logical backups imply up to a backup interval of data loss (more after failed jobs); no WAL/PITR promise.

### Hosted Artifact and Runtime

The [browser and operations artifact](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34858027875/artifacts/10354425992) was downloaded and its ZIP SHA-256 independently verified as **`9a611f4b95fde61abce760de2fbe1ab24865c4d575a39e64acb847999bf31f2c`**. GitHub currently expires it on 2026-12-13; the selected public PNGs and their [checksum/provenance manifest](assets/screenshots/followup-cf6d0f4/manifest.json) remain in Git. The archive excludes private TLS configuration, session/link values and database dumps. It contains `playwright-report/index.html`, `test-results/browser-results.json` and the runtime/restore/privilege/control reports.

These are **CI-built image IDs**, not published registry digests:

- API: `sha256:9f7fff5e3bd358bb1a11e7e4cc9cb029fb4349a122faeb00444595299bd35d04`
- Web: `sha256:52dcab4bd38369958f0f7699764ca49c9c7d07b05afd390bdc5df1d19f75f7ef`

At this revision, hosted outage verification returned readiness 503 in 753ms and authenticated-request 503 in 6004ms while liveness remained 200, then recovered to readiness 200. The control fixture captured six non-sensitive failure alerts. Restore preserved eight business tables and relationships, invalidated restored sessions/links, checked login/tenant boundaries and left the source unchanged. Its private dump checksum was `bc6e42a6bb591fdd889011a94e8d9d2ecaf0e72aad3dab57a07a1fd2c636bc80`; dump/readback took 1935ms and restored startup 16466ms. These small-fixture timings are not an RTO guarantee. Legacy pinned rollback kept business work available while explicitly gating unsupported account changes/readiness.

The earlier [7cd96e4 run](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34855499610) and [af44f18 run](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34855913516) failed at fixture secret ownership. The `c05b433` correction passed [the entire workflow](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/34856926274); the later `cf6d0f4` audience fix also passed every gate. No security, outage, restore or browser assertion was removed to obtain a pass.

### Inspected Screenshots

All 15 selected [follow-up screenshots](SCREENSHOTS.md#usability-and-operator-follow-up-2026-09-14) were opened and visually inspected from the `cf6d0f4` hosted artifact. They cover login, account success/error/setup, invitation delivery, comment audiences, compact/expanded mobile filters, preserved desktop density, dark mode and native 200% focus. Historical captures remain unchanged. The manifest records scenario, revision, source, viewport and pixel checksum.

Hosted Chrome 153.0.8010.12 native zoom changed DPR 1 to 2 and CSS width 1440 to 720 while the outer window remained 1440px. This differs from local Windows scrollbar dimensions below; neither is simulated CSS zoom. Screen-reader acceptance remains outstanding.

## Exact Local Preview

Requirements: Node 24, pnpm 9.15.4, Docker Linux containers, OpenSSL on PATH, available loopback ports 8456/8457 and 8036/8037. Start in the Git root, then:

```powershell
cd clientops-tracker
pnpm install --frozen-lockfile
node scripts/hardening-stack.mjs start --followup
```

This builds **local review images**, creates only explicitly named disposable projects and seeds only an empty demo database. Existing follow-up databases are upgraded without reseeding and their business fingerprints checked. Production never seeds automatically. A corporate TLS-inspecting network may require `BUILD_CA_FILE` pointing to its trusted public CA certificate for BuildKit; never disable package TLS verification.

- Demo: <https://localhost:8456>; the labelled disposable Admin/Developer/Client buttons call the real API.
- Non-demo account fixture: <https://localhost:8457>; bootstrap identity `owner@accounts.example`, fixture-only passphrase `Local-owner-passphrase-42`. This is an explicit disposable test account, not a production credential. Login shortcuts are absent.
- Capture-only mail: <http://localhost:8037> for the account fixture, port 8036 for the demo. Do not enter real recipients.
- Accept the self-signed warning only for these loopback fixtures. Private keys/configuration stay under ignored `test-results/tls/` and are excluded from artifacts.

Reproduction commands (run serially; outages deliberately interrupt the fixture). The local browser run used the revision-specific `followup-af44f18` output directories recorded below; use a new output directory for another capture:

```powershell
$env:BROWSER_CHANNEL='chrome'
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8456'
$env:ACCOUNT_SETUP_URL='https://localhost:8457'
$env:ACCOUNT_MAIL_URL='http://localhost:8037'
$env:E2E_SCREENSHOT_DIR='test-results/followup/screenshots'
pnpm test:e2e
$env:VERIFY_PROJECT='clientops-followup'
$env:UI_EVIDENCE_DIR='test-results/followup/ui-acceptance'
node scripts/verify-ui-acceptance.mjs
node scripts/verify-database-roles.mjs --followup
node scripts/verify-operations.mjs --followup
node scripts/verify-controls.mjs --followup
node scripts/verify-restore.mjs --followup
```

The browser HTML report is `playwright-report/index.html`; JSON is `test-results/browser-results.json`. Native-zoom evidence is `UI_EVIDENCE_DIR/acceptance.json`; it records actual Chrome Settings zoom, DPR 1 to 2 and CSS width 1422 to 711 at a fixed 1440px outer window. Local clean-`af44f18` evidence was additionally preserved under `test-results/followup-af44f18/`. Operations reports are `test-results/{database-roles,operations-runtime,operator-controls,restore-runtime}.json`. Reports contain revision provenance; private restore dumps/configuration are never publication artifacts.

Dedicated API-test commands used here:

```powershell
$env:TEST_PG_PORT='55436'
$env:TEST_SMTP_PORT='11027'
$env:TEST_MAIL_PORT='18027'
docker compose -p clientops-followup-tests -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@localhost:55436/clientops_hardening_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_hardening_test'
$env:SMTP_MODE='capture'
$env:SMTP_HOST='localhost'
$env:SMTP_PORT='11027'
$env:MAILPIT_URL='http://localhost:18027'
pnpm test
pnpm test:verification
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
docker compose config --quiet
docker compose -f docker-compose.prod.yml --env-file .env.production.example config --quiet
```

Do not reuse these disposable credentials outside this fixture. Compose syntax checks are separate from successful container execution. No existing development or earlier verification database/volume was reset or removed.

## Manual Acceptance and Launch Gates

1. Administrator: use Accounts to invite a fictional client tied to the intended organisation; inspect Email delivery, accept the captured link, then request/reset a password. Confirm Sign in, single-use rejection and logout/session revocation. SMTP acceptance is not proof of inbox delivery.
2. Developer: open a ticket, use status/priority/category changes and refresh; add an Internal note and a Reply to client. Verify the audience-specific confirmation and existing saved/applied triage history.
3. Client: confirm only own organisation records/public comments, reply to a waiting request, and use compact filters at 390x640. Exercise rapid changes, refresh, Back and Reset. No internal-note control or internal workload should appear.
4. Keyboard: Tab through visibility buttons, form errors, Cancel/back, filters and mobile navigation; test Escape/focus restoration and native browser 200% zoom. Screen-reader walkthrough with NVDA/VoiceOver/Narrator is **outstanding**, not inferred from axe results.
5. Before launch: reviewed merge/publication, domain/DNS, VPS access, trusted HTTPS chain and successful Certbot dry-run/deploy-hook acceptance, independent production secrets, TLS SMTP with sender/bounce checks, private off-host bucket policy and key escrow, an actual operator alert destination and external uptime/backup dead-man checks, central security-event retention, representative restore timing and a human recovery owner.

See [OPERATOR_CONTROLS.md](OPERATOR_CONTROLS.md) for exact provisioning, migration, schedules, restore and rollback commands. These commands require reviewed images containing this PR's operator entry points, not the older published `7eba339` image. Certificate hook installation/real renewal and external-service acceptance remain operator work. Historical personal-information cleanup options remain in [PUBLIC_INFORMATION.md](PUBLIC_INFORMATION.md), without repeating the exposed address or rewriting history.
