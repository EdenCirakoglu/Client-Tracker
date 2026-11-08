# Five-Minute Private Shipment Demo

This is the running PR #22 application, using its existing scope and delivery
screens. The separate [Decision Journal concept](CLIENT_JOURNEY_BRIEF.md) is a
design mockup, **not** a running screen or a promised shipped redesign.

## Start

Use the product branch, Node.js 24, pnpm 9.15.4, Docker Desktop's Linux engine,
and Git for Windows/OpenSSL. From the repository root:

```powershell
git switch feature/agency-onboarding-notifications
cd clientops-tracker
pnpm install --frozen-lockfile
node scripts/hardening-stack.mjs start --private-demo
node scripts/prepare-private-demo.mjs --private-demo
```

If this branch is already checked out in a worktree, use that worktree instead
of switching the main checkout. The preparation command prints the exact ticket
URL; it also retains the fictional ticket ID in `test-results/private-demo-record.json`.
Open **https://localhost:8470**. Mail is captured at **http://localhost:8050**;
no real-recipient delivery is configured. The extra account-setup fixture uses
8471/8051. All ports are bound to loopback. Do not expose these fixtures publicly.

The local certificate is self-signed, not trusted production HTTPS. On this
machine antivirus HTTPS inspection may show its own certificate warning; never
disable antivirus or global TLS checking to demonstrate the application. Only
proceed after verifying this is the local disposable fixture. Automated browser
tests allow the local fixture certificate explicitly.

The stack builds this branch locally, applies additive migrations with separate
migration/runtime roles, and seeds only a newly empty named disposable database.
Repeated startup preserves existing business records. It never resets the
development database or earlier verification volumes. The certificate is renewed
locally when less than one day remains. This is separate from the
[published-image verification](RELEASE_CFEC6E71.md), which never rebuilds images.

If Docker's default subnet pool is exhausted, reserve unused subnets first
(the following were unused for this rehearsal; check your own network inventory):

```powershell
docker network create --subnet 10.240.66.0/24 --label com.docker.compose.project=clientops-private-demo --label com.docker.compose.network=default clientops-private-demo_default
docker network create --subnet 10.240.67.0/24 --label com.docker.compose.project=clientops-private-accounts --label com.docker.compose.network=default clientops-private-accounts_default
```

For an HTTPS-inspecting build proxy, supply its approved CA PEM privately through
`BUILD_CA_FILE`. Do not commit a private machine path or disable verification.

## Demonstrate

| Time      | Action and what to say                                                                                                                                                                                                                                                                                           |
| --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0:00-0:45 | Open the printed ticket link while signed out. Choose **Continue as Client**. Sign-in returns to the ticket's delivery section. Title: **Shipment search: active and archived references**; client: fictional Northstar contact.                                                                                 |
| 0:45-1:45 | Read the original request and scope history. Revision 1 excluded archives; the client requested changes. **Revision 2: Approved** includes active and archived references, with exports/imports excluded. Earlier decisions remain visible.                                                                      |
| 1:45-2:45 | Read agreed outcome revision 2: active **NS-1042** and archived **NS-0921** must both be found. Release **1.5.0-demo** shipped. The ticket is **Resolved**, but client acceptance is still pending. No agreed date is invented.                                                                                  |
| 2:45-3:45 | The public comment reports that archived NS-0921 works but active NS-1042 fails. Select **Request changes**, enter that feedback, then **Send feedback**. This records an acceptance decision, not an automatic ticket reopen or release rollback.                                                               |
| 3:45-4:15 | Refresh. **Changes requested** and feedback persist; scope remains approved, the release stays linked and ticket status stays Resolved. These are independent facts.                                                                                                                                             |
| 4:15-5:00 | Account menu: **Logout**. Sign in with **Continue as Developer**, reopen the same printed ticket URL and inspect client feedback/history. Staff can address the issue and propose a fresh outcome; do not erase prior agreement. Admin uses **Continue as Admin** through the same explicit logout/sign-in flow. |

Demo buttons and `password123` are disposable-only. No public signup, arbitrary
role switch or permission bypass is introduced. Separate private browser profiles
can keep two roles open at once; otherwise logout before changing roles.

The example is a delivery record, **not an implemented shipment-search engine**.
The failed reference is fictional client feedback used to show the acceptance workflow.

To rehearse again, preserve the old request and create another:

```powershell
node scripts/prepare-private-demo.mjs --private-demo --new-request
node scripts/hardening-stack.mjs stop --private-demo
```

The second command stops both private fixtures without deleting volumes.
Never use `down -v` or `db:seed` to reset an existing installation.

## Verify

```powershell
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8470'
$env:BROWSER_CHANNEL='chrome'
pnpm exec playwright test e2e/private-demo.spec.ts
```

This creates a separate fictional rehearsal through authenticated, CSRF-protected
APIs. It verifies signed-out destination retention, approved scope revision 2,
linked release, persisted client changes, unchanged resolution, mobile layout,
keyboard submission and axe. Reports: `playwright-report/index.html`,
`test-results/browser-results.json`; captures:
`test-results/screenshots/shipment-demo-awaiting-client.png` (1440x1000) and
`shipment-demo-changes-requested-mobile.png` (390x844), light theme.
The standard combined CI suite includes this scenario. Human screen-reader
acceptance remains outstanding; automated results are not a substitute.
