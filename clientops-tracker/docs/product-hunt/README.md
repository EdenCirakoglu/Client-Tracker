# Product Hunt Draft Pack

**Private draft preparation only. Nothing submitted, scheduled or deployed.**
Intended first advertised version: **0.2.0**, currently **0.2.0 preview, unreleased**.
This is a proposed launch label, not a tag or a package-version/release claim.
The preview depends on PR #22 and this branding PR. Advertise the merged version
only after independent security review, main CI, exact-image verification and
the relevant public visitor-path acceptance.

## Contents

- [Canonical approved v3 PNG](../../apps/web/public/brand/journal-v3.png)
  is used by the application, favicon, account screens and walkthrough.
  SHA-256: `4e84301ab7fa39a2f9a80e65eebd8b494d04677149224608304f972083cd47bd`.
  240x240, 29,324 bytes. No regeneration, SVG reconstruction or substituted mark.
- [Form copy](FORM_COPY.md): independent maker identity, preview wording and
  fields deliberately left unset.
- Exactly three gallery PNGs and their manifest are generated from a clean
  branded checkout by `node scripts/capture-product-hunt.mjs`.
  Captures are real fictional portal records, not Decision Journal concept art.
- [60-90 second recording script](RECORDING.md).
- [No-login walkthrough](../../apps/web/public/walkthrough/index.html):
  static local files, no application/API/database access, explicit simulation.
- [Private quote worksheet template](QUOTE_WORKSHEET.md).

The larger PNG master and the three earlier gallery-panel files were not
available in the checkout. The owner supplied the 240px path again; that exact
file is authoritative. The old `logo-source.svg` is **not** its vector source.
No comparison against unavailable gallery panels or larger master is claimed.
New captures are the review candidates, not a reconstruction of missing panels.

## Preview and Reproduce

Use the branding worktree on `feature/journal-brand-product-hunt`, based on
PR #22 head `9e25bc27d73ae1756c8fc185223704417de8642b`.
Do not retarget or merge the branding PR until #22 is independently cleared
and merged. Then retarget, inspect the branding-only diff and rerun checks.

The existing [private demo](../PRIVATE_DEMO.md) applies. Preserve its ignored
fixture keys when using an existing named stack from another worktree; do not
generate replacement database/session secrets for an existing volume.

```powershell
pnpm install --frozen-lockfile
node scripts/hardening-stack.mjs start --private-demo
$env:E2E_ALLOW_DISPOSABLE_DEMO='true'
$env:VERIFY_URL='https://localhost:8470'
$env:VERIFY_PROJECT='clientops-private-demo'
$env:BROWSER_CHANNEL='chrome'
node scripts/capture-product-hunt.mjs
pnpm exec playwright test e2e/branding.spec.ts e2e/private-demo.spec.ts
node scripts/verify-ui-acceptance.mjs
```

The gallery script creates a **new** fictional request through normal CSRF and
permission checks, records client feedback and refreshes before capturing it.
It never resets a database. All email remains captured by Mailpit.
Open `https://localhost:8470/walkthrough/index.html` for the separate signed-out
example; alternatively open its HTML directly without Docker or an API.
The loopback certificate is self-signed, not production HTTPS.

## Release and Review Gates

Main remains `cfec6e71a51975e224a2cee9ddda2238183b8b31`.
[Its exact published-image verification](../RELEASE_CFEC6E71.md) remains valid
for that revision only; it was not repeated for branding or relabelled.
PR #22's normal CI passed at `9e25bc27`; its **CSRF policy failed** despite
successful CodeQL analysis. [Independent security disposition](../CSRF_REVIEW.md)
and two unaccepted development-tool findings remain. No checks or policy change
is part of branding.

Keep Preview labels on the gallery/form until the advertised version is released.
The repository is a genuine current destination; the walkthrough has **no public
URL yet**. Contact route, final price, capacity, terms and genuine booking/checkout
are internal owner tasks. Do not add dead Book/Buy links or publish localhost.
The software is free under MIT; assisted installation is a separately priced service.

Human screen-reader testing, trusted HTTPS/renewal, authenticated SMTP,
approved recipients, off-host backup/restore, alerts and named operational
ownership still require separate acceptance. Fixtures do not establish these.
