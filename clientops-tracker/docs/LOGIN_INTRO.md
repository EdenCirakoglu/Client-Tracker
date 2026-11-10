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
