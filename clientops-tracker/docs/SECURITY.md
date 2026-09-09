# Technical Security Notes

This document describes the current security controls and the work required before using ClientOps Tracker with real customer data.

## Current Controls

- Passwords are hashed and verified with `bcryptjs`; plain-text passwords are not persisted.
- JWTs are signed with `JWT_SECRET`, validated on protected requests, and followed by a database user lookup.
- API authorization checks both roles and client ownership.
- Zod validates request bodies and route parameters.
- Helmet supplies common HTTP security headers.
- CORS is configured through `CORS_ORIGIN` rather than being open by default.
- Express JSON request bodies are limited to 1 MB.
- Internal comments are filtered from client responses and cannot be created by clients.
- Client metrics omit developer workload entirely. Saved triage, generation, application and internal ticket history are staff-only, including ticket creation responses.
- Test configuration cannot fall back to development/production. Destructive seeds require an explicitly designated disposable database and reset confirmation.
- Database access uses Drizzle ORM and parameterized PostgreSQL queries.
- Production Compose exposes only Nginx publicly; the API, web, and PostgreSQL services use the private Compose network.

## Authentication Behavior

The login endpoint verifies a seeded or provisioned user and returns a JWT. The frontend stores that token in localStorage for the current MVP. The API remains responsible for validating every protected request; hiding a frontend button is not considered authorization.

JWTs currently last one day. There is no refresh-token rotation, server-side session
revocation, or remote logout. LocalStorage persists across browser sessions and is
readable by JavaScript, so XSS can expose bearer tokens. HTTP-only secure cookies
would reduce token exfiltration risk but require deliberate CSRF/session design.
The UI now clears the session on protected-request 401 responses and synchronizes
logout across tabs; that is not a substitute for server-side revocation.

## Production Requirements

- Use a strong, randomly generated `JWT_SECRET` and unique database credentials.
- Serve both frontend and API over HTTPS.
- Replace localStorage tokens with secure, HTTP-only, appropriately scoped cookies.
- Do not use the demo accounts or seed data in production.
- Keep `.env.production` out of version control and limit its file permissions.
- Add rate limiting, audit log retention, structured logging, secret rotation, backups, monitoring, and dependency update automation before handling sensitive customer data.
- Restrict PostgreSQL network access to the application network and trusted administration paths.
- Add HTTPS termination at Nginx or an upstream load balancer before handling real credentials or customer data.

## Reporting

Do not open a public issue for a vulnerability. Follow the reporting instructions in the root [SECURITY.md](../SECURITY.md).
