# Technical Security Notes

This document describes the current security controls and the work required before using ClientOps Tracker with real customer data.

## Current Controls

- Passwords are hashed and verified with `bcryptjs`; plain-text passwords are not persisted.
- Signed opaque session cookies are backed by PostgreSQL and a durable revocation record. Bearer JWT authentication has been removed.
- API authorization checks both roles and client ownership.
- Zod validates request bodies and route parameters.
- Helmet supplies common HTTP security headers.
- CORS allows only `APP_ORIGIN` and optional `API_ORIGIN`, with credentials. Unsafe requests also require a synchronizer CSRF token and a permitted Origin when present.
- Express JSON request bodies are limited to 1 MB.
- Internal comments are filtered from client responses and cannot be created by clients.
- Client metrics omit developer workload entirely. Saved triage, generation, application and internal ticket history are staff-only, including ticket creation responses.
- Test configuration cannot fall back to development/production. Destructive seeds require an explicitly designated disposable database and reset confirmation.
- Database access uses Drizzle ORM and parameterized PostgreSQL queries.
- Production Compose exposes only Nginx publicly; the API, web, and PostgreSQL services use the private Compose network.

## Authentication Behavior

`express-session` uses `connect-pg-simple` for the `web_sessions` store. The browser
holds only a signed random SID in an HttpOnly, SameSite=Lax, Path=/ cookie. In
production it is Secure and named `__Host-clientops.sid`, without a Domain attribute.
Development uses `clientops.sid` so loopback HTTP can work. Production requires HTTPS.
The frontend uses credentialed fetch; no credentials are stored in localStorage.
One-time cleanup removes the obsolete `clientops_token` key without reading it.

`auth_sessions` is an authoritative grant keyed by SHA-256(SID), not a second browser
credential. Every protected request reloads the user and atomically checks the grant:
active account, current `authVersion`, no revocation, idle expiry and absolute expiry.
Defaults are 30 minutes idle and eight hours absolute. Accepted requests advance
idle expiry, clamped to absolute expiry; cookie rolling never extends that absolute
deadline. Expiry is enforced by the server's database clock, not the browser.

Login regenerates the SID and synchronizer token, preventing session fixation.
Logout revokes the grant before destroying session JSON. A late concurrent session
save cannot revive authorization. Password reset/change, disablement and API role/
organisation edits bump `authVersion` and revoke all grants and outstanding account
tokens in the same transaction. Requests already authorized may finish; subsequent
requests fail. Current roles and ownership are never copied from a stale cookie.
Changing `SESSION_SECRET` rejects all old signed cookies; rotate through an operator
controlled restart. Reauthentication creates a new session, not a refresh JWT.

`GET /api/auth/csrf` creates an anonymous session and returns a synchronizer token.
Every POST/PATCH, including login, recovery, invitation consumption and logout,
requires its `X-CSRF-Token`. Login returns a rotated token. Read-only GETs do not
mutate business data. SameSite is defense in depth, not a substitute for CSRF checks.
Origin checks reject unapproved browser origins; non-browser callers without Origin
must still hold the session cookie and CSRF token. Responses are `Cache-Control: no-store`.
`TRUST_PROXY=1` is only safe with the supplied sole proxy and unexposed API port;
Nginx overwrites forwarding headers. Direct host development uses zero trusted hops.

## Account Lifecycle

The operator-only `auth:bootstrap` command accepts explicit name, email and a strong
password through environment variables. A PostgreSQL advisory transaction lock plus
a durable singleton `bootstrap_state` prevents concurrent duplicate bootstraps. It
refuses if any administrator exists or bootstrap was previously completed. It never
upserts an existing account. There is no public bootstrap or registration endpoint.

Only administrators invite users and assign roles/organisations. CLIENT requires a
real client ID; staff must have null. Invitation acceptance cannot assign a role.
Pending invitations can be resent (previous links invalidated); active identities
cannot be overwritten. Account changes prevent an administrator disabling or
demoting themselves, preserving an active administrator. Role edits and invitations
recheck the acting administrator inside the serialized account-management transaction.

Invitation/reset tokens contain 32 random bytes, are stored only as SHA-256 hashes,
expire after 24 hours/30 minutes respectively, and are consumed atomically. User-row
locking serializes concurrent token consumption, password changes and disablement.
Resetting a password invalidates every outstanding link and every prior session.
Links use URL fragments, removed on page load; raw tokens do not reach proxy access
logs. Passwords require 12 characters and at most 72 UTF-8 bytes to avoid bcrypt
truncation. Bcrypt cost is 12; unknown login identities also perform a bcrypt check.

Recovery always returns the same 202 response before account lookup/email delivery.
Delivery failures are logged without addresses or tokens. Delivery is best-effort
within the API process, not a durable queue; process interruption can lose a recovery
email. Users can request another link. Durable delivery/retry monitoring is a launch
requirement, not something verified by local Mailpit tests.

`rate-limiter-flexible` uses shared PostgreSQL buckets, without memory fallback:
login 100/IP/15min and 20/email+IP/15min; recovery 20/IP/hour and 5/email+IP/hour;
token consumption 30/IP/15min; password change 10/IP/15min; invitations 30/IP/hour;
CSRF preflight 200/IP/15min. Limits are not evidence of DDoS protection. Add upstream
abuse controls and tune for shared networks before public launch. Store failures
fail closed with 503. Limit responses include `Retry-After`.

Known seed identities are marked `is_demo` by the additive migration. Both login
and existing session authorization reject them unless `DEMO_MODE=true`, an explicitly
named disposable database, and a loopback application origin are configured. Seeds
remain explicit and forbidden in production. Never enable demo mode on public data.

## Production Requirements

- Use a strong, randomly generated `SESSION_SECRET` and unique database credentials.
- Serve both frontend and API over HTTPS.
- Configure trusted TLS certificates and renewal; local self-signed tests do not verify a production certificate service.
- Do not use the demo accounts or seed data in production.
- Keep `.env.production` out of version control and limit its file permissions.
- Add account-security audit retention, structured logging, secret rotation, backups/restore drills, monitoring, and dependency update automation before handling sensitive customer data.
- Restrict PostgreSQL network access to the application network and trusted administration paths.
- Configure SMTP with TLS and verified sender/domain (SPF/DKIM/DMARC). `SMTP_MODE=smtp` requires credentials and TLS; do not disable certificate validation. Local capture only accepts fictional recipients at example.com, _.example or _.test and never forwards mail.
- Define retention for expired `account_tokens` and `auth_sessions`. Session JSON and rate buckets are automatically pruned; authoritative revocation records must not be removed while a corresponding session could still be valid.
- Cookies reduce credential exfiltration but do not eliminate XSS, malware or compromised administrator risk. MFA, security-event audit UI and distributed abuse protection remain future work.

## Reporting

Do not open a public issue for a vulnerability. Follow the reporting instructions in the root [SECURITY.md](../SECURITY.md).
