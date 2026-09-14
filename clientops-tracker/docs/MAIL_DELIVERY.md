# Durable Account Email

Migration `0002_tired_gladiator` adds `mail_outbox`; existing business tables and account tokens are unchanged.

## Transaction and Privacy Model

Invitations commit the account, hashed single-use token and encrypted delivery in one transaction. A recovery request commits an encrypted intent **before** returning the same 202 response for every valid address. Account lookup happens in the worker, avoiding the previous process-crash window after acknowledgement and SMTP/account lookup timing in the HTTP response. Rate limits and CSRF still apply. Database outages return a generic 503, regardless of address.

Queued recipients and raw tokens are encrypted with AES-256-GCM, fresh 96-bit nonce, 128-bit authentication tag and the job ID as authenticated associated data. `MAIL_ENCRYPTION_KEY` is a separate 32-byte random hex key, required in production. Keep it in the operator secret store, separate from backups and the session signing secret. Losing/changing it prevents queued delivery; do not silently fall back to another key in production. Drain before planned rotation, or cancel pending work and issue new links. Local development derives a non-production key from its session secret only when no key is configured.

Account token rows continue to store SHA-256 hashes only. Encryption does not make database backups public-safe: they still contain business information and password hashes. Payloads are erased after delivery, terminal failure or expiry. Never log a token, message body, email address, SMTP error object or encryption key.

## Worker and Retries

Each API process starts a dispatcher. `node dist/mail-worker.js` can run an additional worker using the same image and environment. PostgreSQL `FOR UPDATE SKIP LOCKED` claims one row at a time; a random 90-second lease fences completion by replaced workers. SMTP does not hold database locks. Recovery intent is transformed into a token and encrypted message transactionally, so retrying a delivery reuses the same token.

At most eight attempts are scheduled with exponential delays starting at 15 seconds, capped at one hour and bounded by link expiry. Invitations expire after 24 hours; recovery expires 30 minutes after request admission, not after a delayed dispatch. Expired, consumed, superseded and disabled-account links are excluded. Crashed final attempts and expired payloads are cleaned in bounded batches. Each poll drains up to five jobs. A 30-second send deadline prevents a blocked transport monopolising the worker.

Delivery is **at least once**, not exactly once. An SMTP server can accept mail before the application loses the acknowledgement, crashes or reaches its deadline. Retrying can deliver a duplicate copy of the same single-use link. A late SMTP completion cannot change the new worker's state; a token remains single-use even if several emails arrive. Pending work must not be discarded during normal application restarts.

## Operations

`GET /api/users/deliveries` is administrator-only. It returns full status counts and the latest 30 attempts without recipients or payloads. Statuses: PENDING, SENDING, DELIVERED, EXPIRED, FAILED. Alert on FAILED increases, pending age above five minutes, or repeated `mail_worker_unavailable` events. These thresholds are starting operator policies, not a promised delivery SLA. A delivered status means SMTP accepted the message, not that a mailbox received or read it.

Inspect configuration/SMTP health before requesting a fresh invitation or recovery link. Do not add an unrestricted resend endpoint or extend expired tokens. Run `node dist/maintenance.js` inside the API image for bounded 30-day terminal-row retention; see [operations](OPERATIONS.md). No credentials are retained in terminal rows.

Production uses authenticated SMTP with implicit TLS or required STARTTLS and certificate verification. Local verification uses Mailpit with fictional `.example`/`example.com` addresses only. No real email service or recipient was used for verification. Production SMTP credentials, sender-domain verification, SPF/DKIM/DMARC and bounce handling remain operator launch work.

Design references: [PostgreSQL queue locking](https://www.postgresql.org/docs/current/sql-select.html), [Node authenticated encryption](https://nodejs.org/api/crypto.html), [node-postgres timeouts](https://node-postgres.com/apis/client).
