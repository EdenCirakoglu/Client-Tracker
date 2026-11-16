# Login Logo Intro

## Scope

`feature/logo-intro` is based on PR #35 at
`c9cda1d89f30dc01c04cc23983611302484b6c28`. It is a separate visual increment;
retarget and recheck it after that parent lands. No API, session, schema, dependency,
public walkthrough or security-policy changes are included.

The existing `/brand/journal-v3.png` is unchanged. A CSS glass reveal settles around
the mark and fades into the existing login screen within 2.2 seconds. This is an
original, lightweight interpretation of the supplied ReactDrops reference, not
its WebGL renderer. No third-party component code was copied: the referenced
[registry component](https://reactdrops.dev/r/liquid-glass-logo.json) carries
redistribution restrictions, rather than the repository's MIT terms.

## Behaviour

- Plays once per browser tab, including entry through `/` and `/dashboard`.
- No visible skip button. The brief intro finishes automatically; Escape still
  dismisses immediately. Tab stays within the intro while it is open. Dismissal
  focuses the Sign in heading, then Tab reaches Email. Enter cannot submit the
  background login form.
- Reduced-motion visitors go straight to sign-in. Enabling reduced motion during
  playback also dismisses it.
- Record destinations bypass the intro. Validated query parameters and section
  anchors are still handled by the existing login destination helper.
- Logout and a detected session expiry do not replay it. Authenticated visitors
  still redirect without waiting for the animation.
- The cosmetic `clientops:login-intro:v1` sessionStorage entry contains only `seen`.
  It is not a credential and does not alter authentication. Storage denial skips
  the intro instead of blocking sign-in.
- The dismissal timer does not depend on animation events, API availability,
  image loading or WebGL. Without JavaScript the dialog remains closed.
- Light, Dark and System use the existing semantic theme tokens. There are no
  network requests to an animation service and no new packages.

## Preview And Checks

On an already configured local application, visit `/login` in a new tab/session.
To replay in the same tab, remove only `clientops:login-intro:v1` from sessionStorage
in browser developer tools and reload. Do not remove authentication cookies.

From the pnpm workspace, against an explicitly disposable loopback demo:

```powershell
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm build
pnpm format:check
$env:VERIFY_URL = 'http://localhost:3080'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
pnpm exec playwright test e2e/login-intro.spec.ts e2e/branding.spec.ts
```

The focused tests cover timing, keyboard dismissal, repeat visits, reduced motion,
storage/image/API failures, a real demo login with query/anchor return, logout,
both themes, short/mobile layouts and native Chrome 200% zoom. Existing branding
tests retain the canonical logo hash, navigation and API-free walkthrough checks.
The controlled test clock advances during axe/capture so browser animation-frame
callbacks can complete; production timeouts are not extended for testing.

Reports: `playwright-report/index.html`, `test-results/browser-results.json`.
Captures: `test-results/logo-intro/{desktop-light,mobile-dark,short-light,login-after,native-200}.png`.
Native zoom measurements: `test-results/logo-intro/native-200.json`.
Mid-reveal captures use the real CSS animation at 900ms, not edited artwork.

Human screen-reader acceptance remains pending. Check that the intro is announced
once, Escape dismisses it, and the Sign in heading and Email
field are reachable afterwards. Existing release, dependency and security-policy
decisions remain separate from this visual check.

## Initial Verification (810c12b)

- Frozen install, workspace lint/typecheck, API and web builds, formatting: passed.
  The initial sandboxed API build could not resolve its workspace path; the same
  build passed outside that filesystem sandbox, without code changes.
- Focused browser suite: 13 passed (11 intro scenarios, 2 existing branding and
  walkthrough scenarios). No skipped tests or retry-based passes.
- Desktop 1440x1000, dark mobile 390x844, short 768x360 and native 200% zoom captures
  inspected. Native zoom measured DPR 1 to 2 and inner width 1422 to 711.
- Preview uses a separately named `clientops-logo-preview` PostgreSQL volume,
  database `clientops_logo_demo`, existing migrations and fictional seeds. No
  development, release-verification or customer-guidance database was reset.
- Early test iterations found a Tab focus edge case (fixed), a hydration race in
  the reduced-motion test (wait for hydration), and paused-clock capture stalls
  (advance browser frames). No production duration or assertion was weakened.
- API regression suites, full container rehearsals, hosted CI, screen-reader
  testing and public deployment are not claimed by these local visual checks.

The running local preview is `http://localhost:3080/login`; its API listens only
on `127.0.0.1:8085` and new PostgreSQL fixture only on `127.0.0.1:15460`.
Private fixture launchers and generated reports are ignored under
`test-results/logo-preview` and `test-results/logo-intro`. They are not production
configuration or part of the shipped application.

## Button Removal Follow-Up

The visible skip button was removed at the maintainer's request. Escape,
reduced-motion handling, automatic dismissal and sign-in focus restoration remain.
Coverage now asserts that there are no intro buttons and that Enter cannot submit
the background form. The first local run passed 12 of 13 scenarios; its contrast
check sampled the title mid-fade (2.13:1). Like the existing visual captures, that
check now samples the real animation at its settled 900ms frame rather than an
uncontrolled point during the fade. Contrast rules and production timing remain
unchanged. Prior button-bearing captures are retained locally under
`test-results/logo-intro-810c12b`.

## November 11: Combined-Suite Rate Limit Diagnosis

The [original #36 CI failure](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42916146800)
at `23484934143dc4f885d70b34a172337053fd8d61` passed 27 browser cases and failed
the final two workflow-notification cases waiting for `Continue as Developer`.
Its archive SHA-256 was downloaded and verified as
`e0c803a881dc81d1feff2aefab789b897678084abb41cf0ae412e83999f2bbce`.
The captured-email case's screenshot shows a sign-in form with no intro overlay
and no demo controls. The artifact alone did not record the configuration response.

A diagnostic-only checkpoint, `b2c35902765f51d2d8db2ade13cf4182b419e3f4`,
kept the combined 29-case suite and all production settings unchanged. It checks
the actual login page's `/api/auth/config` response before looking for a demo
button, without making an extra request or logging cookies/tokens/bodies.
[Diagnostic CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/43061447199)
reproduced both failures as **HTTP 429**, with
`limit=300, remaining=0, reset=743` and `reset=742` respectively. The other 27
cases passed. The 300-request/15-minute authentication ingress budget is shared
by the single runner IP; it includes configuration/session reads, not only logins.
The login screen fails closed with demo access disabled when configuration fails.
Extending a locator timeout or changing animation timing would not fix that cause.

The scoped fix adapts PR #37 commit
`97562213b686c6ca90d8501728979042138a9cf5`:

- `Validate` keeps all **18 core business/account browser scenarios** and every
  existing static, audit, API, migration, accessibility and operational check.
- `Review browser journeys` owns a separate runner and fresh disposable Compose
  fixtures for all **11 intro scenarios**, including real login/return-destination,
  keyboard, reduced motion, failures, both themes and native 200% zoom.
- Both jobs check out the exact PR head and retain privacy-gated browser artifacts
  and cleanup. Test discovery confirms 18 + 11 = 29, with no omitted scenarios.
- No application code, rate limit, token/session behaviour, duration, timeout,
  retry policy, assertion, dependency or workflow permission is relaxed. The
  existing API ingress-limit tests still verify exhaustion and recovery.
- PR #37's intro component, login page, configuration and intro tests are identical
  to the original #36 head; no Meridian UI work is needed for this fix. Its three
  extra review cases are not copied into #36. Later integration must preserve its
  broader test selection and obtain checks for the resulting revision.

Reproduce each partition on its **own fresh isolated runner/stack**, from the
pnpm workspace, after the normal frozen install and browser installation:

```sh
node scripts/hardening-stack.mjs start
E2E_ALLOW_DISPOSABLE_DEMO=true VERIFY_URL=https://localhost:8443 ACCOUNT_SETUP_URL=https://localhost:8444 ACCOUNT_MAIL_URL=http://localhost:8026 node node_modules/@playwright/test/cli.js test --grep-invert 'login-intro.spec.ts'
node scripts/hardening-stack.mjs stop
```

On the second fresh runner:

```sh
node scripts/hardening-stack.mjs start
E2E_ALLOW_DISPOSABLE_DEMO=true VERIFY_URL=https://localhost:8443 pnpm test:e2e e2e/login-intro.spec.ts
node scripts/hardening-stack.mjs stop
```

Do not run these fixed-name fixture commands over preserved local databases.
CI creates fresh volumes on independent runners; this is not a limiter reset
inside a test. The exact final run/results and archive checksums belong to the
PR handoff. The deliberately failing diagnostic is retained as historical evidence.

### Separate Review And Hosting Gates

PR #22 remains at `9e25bc27d73ae1756c8fc185223704417de8642b` with passing
application CI but **failing CSRF policy**, despite successful CodeQL execution.
The [independent CSRF and cookie review packet](https://github.com/EdenCirakoglu/Client-Tracker/pull/22#issuecomment-6801804519)
states two distinct decisions and pins the existing source/tests. Neither finding
is dismissed or approved here. Human screen-reader acceptance remains outstanding.

`Workers Builds: client-tracker` is a separate, failed Git-connected Cloudflare
check, not application CI. Its GitHub check provides no diagnostic build log;
the cause is not established here. The separate public fictional walkthrough
returned HTTP 200 on November 11 and was not modified. No deployment, Cloudflare
configuration, public walkthrough, image publication or merge is part of this fix.
