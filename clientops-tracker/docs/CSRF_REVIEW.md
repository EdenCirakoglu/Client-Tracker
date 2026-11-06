# CSRF Review: 6 November 2026

## Actual Finding, Not Scanner Success

At `f2be50394906d355e51a81cf4cc186bf467c4185`, PR #22's
[code-scanning policy check failed](https://github.com/EdenCirakoglu/Client-Tracker/runs/122899382057):
one high-severity alert. The separate Actions and JavaScript analysis jobs
completed successfully; that was never sufficient to call the security result
clean. The October handoff's shorthand "CodeQL passed" meant execution, not the
policy conclusion, and must be read with this correction.

Alert [#1](https://github.com/EdenCirakoglu/Client-Tracker/security/code-scanning/1):
`js/missing-token-validation`, CWE-352, security severity 8.8, points to
`apps/api/src/middleware/session.ts:34-42`, the `express-session` construction.
It is the same existing alert recorded on main, not a new exploitable path
established by the product PR. Its PR instance aggregates cookie-dependent
mutation handlers, including summary publication and notification preferences.
Alert #3, `js/clear-text-cookie`, is separate and remains open; production uses
Secure/HttpOnly/SameSite=Lax \_\_Host cookies, while local HTTP uses a distinct
non-Secure cookie. Neither alert is dismissed by this review.

## Request and Token Flow

1. `app.ts` parses bounded JSON, sets CORS/Helmet and bounds auth traffic.
2. The `/api` middleware chain installs `sessionMiddleware`, no-store response
   headers, then `csrfProtection`, before mounting auth/business routers.
3. `/api/auth/csrf` generates a cryptographically random session-bound token and
   saves the PostgreSQL-backed session before returning it. CORS only permits
   configured origins. Health/docs routes registered earlier do not mutate
   authenticated business records.
4. Unsafe requests with a supplied foreign Origin are rejected. Regardless of
   whether Origin is supplied, `csrfSynchronisedProtection` checks the
   `X-CSRF-Token` header against the token in that session. Body/query values do
   not substitute for the header. Only GET/HEAD/OPTIONS are exempt.
5. Rejection calls the error handler and yields sanitized 403 `CSRF_INVALID`;
   business validation/authorization/mutation handlers do not run. Valid proof
   still requires the existing session, role, organisation and designated-reviewer
   checks. Login rotates the session and token; logout/recovery revoke access.

The query is a **problem query**, not a source-to-sink taint-path query. Its
[source](https://github.com/github/codeql/blob/main/javascript/ql/src/Security/CWE-352/MissingCsrfMiddleware.ql)
infers cookie middleware guarding unsafe handlers and looks for recognized CSRF
middleware or local session-token checks. Its package recognizers include csurf,
tiny-csrf, lusca and Express's legacy csrf member, but not csrf-sync. Our token
comparison is in that dependency behind the wrapper, not an inline application
comparison. Inspecting the installed `csrf-sync/lib/index.cjs` confirms token
storage in `req.session.csrfToken`, header extraction, exact comparison and
rejection. See the [maintained library documentation](https://github.com/Psifi-Solutions/csrf-sync)
and [query help](https://codeql.github.com/codeql-query-help/javascript/js-missing-token-validation/).
This supports a model-coverage explanation, not a request to replace the library
with a legacy implementation merely to obtain a green badge.

## Focused Evidence

`apps/api/tests/csrf-boundaries.test.ts` adds six tests. Four bounded matrices
exercise all 26 registered POST/PATCH mutation paths with missing, forged,
cross-session and foreign-origin proof. Another covers PUT/DELETE and refuses
query/body proof. A positive control persists a client with matching proof and
confirms a client role still cannot create organisations. Empty bodies and
unknown IDs in negative cases intentionally distinguish the global CSRF guard
from downstream validation/lookup failures: each must return `CSRF_INVALID`,
not just any 403. Existing rotation, logout replay, reset, HTTPS, tenancy and
concurrent-decision tests remain intact. No production code, query, suppression,
timeout, rate limit or workflow permission changed.

Run from `clientops-tracker` with explicit disposable test database and Mailpit
configuration (never a development/customer database):

```powershell
pnpm install --frozen-lockfile
pnpm --filter @clientops/api exec vitest run tests/csrf-boundaries.test.ts tests/security.test.ts
pnpm test
```

The final PR handoff records the actual tested revision, CI and policy-check
conclusions. A successful test run alone is not disposition approval.

## Proposed Disposition, Pending Owner Review

Evidence supports **false positive due to unmodeled middleware**, with no bypass
reproduced in the reviewed routes. Owner/security reviewer: inspect this flow,
the query/library source and regressions, then explicitly approve or reject that
classification. Do not dismiss it automatically or weaken scanning. An upstream
model improvement is a separate option; no synthetic inline check or suppression
is added here. Until reviewed, PR #22 retains an unresolved security-review gate
even when its CI and analysis execution succeed. Reopen this assessment whenever
route registration, token extraction, session persistence or allowed origins change.

## Historical Invitation Failure

The October 28 failure at `5068312` remains unexplained: its catch block discarded
the error/status, and no original private request data should be reconstructed
or guessed. Later maintenance diagnostics distinguish invitation acceptance,
new-member login, numeric status, error type and CSRF fetch failures without
logging bodies, tokens or headers. Subsequent strict October runs passed; fresh
November CI repeats the same outage/restart/concurrent-worker scenario. Neither
passing repetitions nor this CSRF review proves the historical cause. No blanket
retry, skipped assertion or larger timeout is an acceptable resolution.
