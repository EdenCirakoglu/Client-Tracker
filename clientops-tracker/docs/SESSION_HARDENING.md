# Sessions and Account Provisioning

This phase replaces browser-stored JWTs with server-revocable cookie sessions.
It does not deploy publicly. Historical registry verification remains tied to
`3fa8d7f51a3dc9bfc9225697085131d75d9ec197`; it is not verification of these changes.

## Design and Migration

- Maintained [express-session](https://expressjs.com/en/resources/middleware/session/)
  and [connect-pg-simple](https://github.com/voxpelli/node-connect-pg-simple) provide
  signed random SID cookies and PostgreSQL session storage. No in-memory production store.
- [csrf-sync](https://github.com/Psifi-Solutions/csrf-sync) protects unsafe requests
  with a session-bound synchronizer token. Role/organisation checks remain in Express.
- `0001_tense_scarlet_witch.sql` adds `web_sessions`, `auth_sessions`, `account_tokens`,
  `bootstrap_state`, `auth_rate_limits`, and user status/version/demo fields. It does
  not recreate business tables or change their IDs, passwords or history. Legacy
  fictional seed accounts are marked as demo identities; they cannot log in publicly.
- `auth_sessions` is authoritative: logout/reset/disable revocation cannot be undone
  by a concurrent late session-store save. Sessions expire after 30 minutes idle or
  eight hours absolute by default. Login regenerates SID and CSRF. Password or access
  changes revoke all sessions. See [SECURITY.md](SECURITY.md) for exact semantics.
- Nodemailer uses Mailpit for local tests only. Production SMTP credentials, TLS,
  sender-domain verification and delivery operations must be configured separately.

## Host Development

Requires Node.js 24, pnpm 9.15.4, Docker Desktop/Linux containers and Git. Run pnpm
inside `clientops-tracker/`, not the Git root. Review existing env files instead of
overwriting them. `apps/api/.env.example` documents all new variables; old
`JWT_SECRET`/`CORS_ORIGIN` values no longer control authentication.

For the existing host development database: explicitly choose its host URL,
apply `pnpm db:migrate`, configure `APP_ORIGIN=http://localhost:3000`,
`API_ORIGIN=http://localhost:8080`, a new `SESSION_SECRET`, and `TRUST_PROXY=0`.
Run `pnpm dev`. Do not seed or reset an existing database just to enable login.
Use a dedicated disposable demo for default credentials. For local captured mail,
`pnpm db:test:up` supplies Mailpit at SMTP localhost:11025 and UI localhost:18025.

## API Tests

The dedicated test cluster is separate from development and older verification
databases. It has tmpfs storage and may be destroyed/recreated. Tests require an
explicit URL/name and never fall back to `DATABASE_URL` or a production env file.

```powershell
cd "C:\Users\PnP\Desktop\Client Tracker\clientops-tracker"
pnpm.cmd install --frozen-lockfile
pnpm.cmd db:test:up
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@localhost:55434/clientops_hardening_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_hardening_test'
$env:SMTP_MODE='capture'
$env:SMTP_HOST='localhost'
$env:SMTP_PORT='11025'
$env:MAILPIT_URL='http://localhost:18025'
pnpm.cmd lint
pnpm.cmd typecheck
pnpm.cmd test
pnpm.cmd build
pnpm.cmd format:check
```

Alternatively place those test-only settings in `apps/api/.env.test` using its
example. Production-cost bcrypt remains enabled in tests; multi-password scenarios
have a 30-second timeout. All 37 earlier regressions are retained, using real
cookie/CSRF requests. Additional coverage checks session expiry, logout replay,
rate limits, CSRF, token races, revocation, bootstrap and account assignment.
There are 55 tests in six files: 37 retained regressions, 15 session/account tests
and three production configuration checks. The copied production example secret
and HTTP production origins are rejected at startup.

## Isolated HTTPS Browser Verification

Requires OpenSSL (Git for Windows includes it at
`C:\Program Files\Git\usr\bin\openssl.exe`; override `OPENSSL_PATH` if needed),
Docker Compose and free loopback ports 8443, 8444, 8025 and 8026. Do not substitute a
public URL. The script permits no production target and has no destructive reset command.

```powershell
pnpm.cmd verify:stack
# Choose installed Chrome with a fresh Playwright profile, or install Chromium:
$env:BROWSER_CHANNEL='chrome'
# pnpm.cmd exec playwright install chromium
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8443'
$env:ACCOUNT_SETUP_URL='https://localhost:8444'
$env:ACCOUNT_MAIL_URL='http://localhost:8026'
$env:E2E_SCREENSHOT_DIR='test-results/screenshots'
pnpm.cmd test:e2e
pnpm.cmd exec playwright show-report playwright-report
```

On Linux/macOS use `export NAME=value` instead of PowerShell's `$env:NAME=...` and
`pnpm` instead of `pnpm.cmd`. CI installs Chromium and uses the same stack script.
If corporate TLS inspection is present, use a verified public CA file only as
`BUILD_CA_FILE`; see [deployment notes](DEPLOYMENT.md#trusted-tls-inspection-during-local-builds).
Never disable registry or SMTP certificate validation.

The setup script builds current API/web images, then:

1. Creates project `clientops-hardening`, database `clientops_hardening_demo`, named
   volume `clientops-hardening_postgres_data`. On its first run only, the earlier
   verified API image migrates and seeds this new disposable database. Current
   migrations run afterwards without reseeding. Before/after hashes of all original
   business columns must match; new auth columns are intentionally excluded.
2. Starts Nginx HTTPS at https://localhost:8443. Demo shortcuts are allowed only here.
3. Creates `clientops-accounts`, database `clientops_accounts_demo`, volume
   `clientops-accounts_postgres_data`. Runs current migrations and, only when no
   administrator exists, invokes bootstrap with fictional local-only credentials:
   `owner@accounts.example` / `Local-owner-passphrase-42`. Demo mode is **off**.
4. Starts that separate app at https://localhost:8444 and local captured mail at
   http://localhost:8026 (the demo stack's mail is localhost:8025). No mail forwarding.

The browser suite contains six scenarios:

| Scenario                                       | Evidence                                                                                                                    |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Administrator/developer/client ticket workflow | Real login, creation, comments, triage, refresh, dropdown save/error, privacy, mobile scrolling, axe                        |
| Swagger through Nginx                          | Contract accessible through the same origin                                                                                 |
| Mobile navigation                              | Keyboard focus containment, Escape and focus restoration                                                                    |
| Invalid sessions and cross-tab logout          | Removed credentials cannot authenticate, expired cookie redirects, logout propagates                                        |
| Bootstrap owner/invitation/recovery            | No demo buttons, admin invitation, single-use setup, client navigation, cookie flags, recovery revocation and logout replay |
| Password change                                | Accessible validation, current-password verification, session invalidation and reauthentication                             |

Browser artifacts are separate from Vitest output:

- `playwright-report/index.html`: complete HTML report with attachments.
- `test-results/browser-results.json`: results, Git revision and dirty-tree metadata.
- `test-results/browser/`: scenario attachments/failures; this is Playwright's disposable output directory.
- `test-results/screenshots/`: operational screenshots.
- `test-results/hardening-upgrade.json`: before/after business-column hashes.
- `test-results/tls/`: local self-signed certificate/key, **never uploaded or committed**.

The first exploratory run exposed a same-document setup-link refresh defect;
fragment changes now reset the form. It also exposed the need to scope error
assertions to main content instead of Next.js's route announcer. Existing four
scenarios passed in that run; final results belong in [release evidence](RELEASE_READINESS.md).
Hosted runs also exposed premature navigation in the browser tests. Role switching
now waits for server logout and an unauthenticated probe; invitation setup waits
for the actual Accounts page and the saved organisation. The assertions and six
scenarios are retained, with no automatic retries.

Self-signed certificates are accepted only by the loopback Playwright fixture.
Tests assert actual HTTPS plus Secure/HttpOnly/SameSite/path flags and unreadability
from `document.cookie`. This does not validate public certificate issuance/renewal,
and localhost has browser-specific secure-context exceptions. Production must use
a trusted certificate with normal validation. No real invitation/reset email is sent.

Stop without deleting volumes: `pnpm verify:stop`. Re-running `verify:stack` applies
migrations and preserves records; it does not reseed an existing fixture. Browser
scenarios create fictional records. Use fresh CI fixtures for clean repeatable runs.
Do not reset older `clientops-readiness` or `clientops-registry-3fa8d7f51a3d` databases.

## Non-Demo Bootstrap and Manual Acceptance

After configuring the real private environment and running migrations, use the
API image inside its Compose network. `postgres:5432` is correct there; host Node
uses localhost and a published port, never the Compose hostname.

```bash
dc() { docker compose -p clientops-production --env-file .env.production -f docker-compose.prod.yml "$@"; }
dc up -d --wait postgres
dc run --rm --no-deps api node dist/migrate.js
read -r -p 'Administrator name: ' BOOTSTRAP_NAME
read -r -p 'Administrator email: ' BOOTSTRAP_EMAIL
read -r -s -p 'Unique password (12+ characters): ' BOOTSTRAP_PASSWORD
export BOOTSTRAP_NAME BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
dc run --rm --no-deps -e BOOTSTRAP_NAME -e BOOTSTRAP_EMAIL -e BOOTSTRAP_PASSWORD api node dist/bootstrap.js
unset BOOTSTRAP_NAME BOOTSTRAP_EMAIL BOOTSTRAP_PASSWORD
```

Do not put real passwords in command arguments, shell history, screenshots or GitHub
secrets unnecessarily. Environment injection is visible to privileged Docker/host
operators; run on a trusted machine. Bootstrap refuses existing administrators and
never overwrites accounts. Run it once, not automatically on every startup. A
populated legacy database containing demo admins intentionally blocks bootstrap;
plan an operator-reviewed account migration rather than bypassing the guard.

Manual acceptance: sign in as the provisioned admin; create an organisation; invite
a client assigned to it; open captured mail; set a password; sign in and refresh;
confirm other organisations and internal operations are absent. Request recovery,
reset, and confirm old sessions and links fail. Change role or disable the account
as admin and confirm its old cookie cannot authenticate. Log out and replay the
old cookie to verify 401. Only use fictional local recipients for these checks.

## Following Milestone

Before public launch: independently reviewed hardening PR, backup/restore drill,
monitoring and alerts, production HTTPS/domain/renewal, secret lifecycle, verified
SMTP sender plus delivery reliability/abuse controls, account-security audit retention,
dependency scanning and an operator release/rollback procedure. MFA and durable
email delivery are not implemented in this phase. No DigitalOcean workflow is triggered.
