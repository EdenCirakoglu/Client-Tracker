# Branding and Gallery QA

Scope: supplied v3 mark and the existing portal, not a new dashboard redesign.
Source identity SHA-256:
`4e84301ab7fa39a2f9a80e65eebd8b494d04677149224608304f972083cd47bd`.
Canonical bytes are unchanged. The larger master and prior gallery panels
were unavailable; no visual match against them is asserted.

## Inspected Evidence

- Source 240px image, rendered 16/32/240px in light and dark backgrounds:
  `test-results/product-hunt/logo-sizes-light-dark.png`.
  The journal silhouette survives at 16px; fine page detail is naturally limited.
  At 32px the page and bookmark remain identifiable. No replacement mark needed.
- Historical baseline shell/login at #22 `9e25bc27`; shell capture was taken
  during dashboard loading and is brand-placement evidence only.
- Real branded source `bfbf50eb28ee506392e12a45f0b23043c124418a`:
  login light/dark, collapsed rail, mobile header and drawer; fixture capture paths
  under `test-results/branding`.
- Walkthrough desktop 1280x900 light and mobile 390x844 dark, full-page captures
  inspected. Same canonical mark, readable text, no overlap/horizontal overflow.
- All three final 1270x760 gallery PNGs inspected at original resolution.
  Full revision comparison, delivery evidence, pending confirmation and
  persisted Changes requested feedback are legible. Real v3 application header
  appears in every frame. No acceptance is fabricated.

## Corrections Made

1. Standalone script global-name collision prevented the simulation: isolated
   its scope; browser test now also asserts no page errors and no API requests.
2. Mobile drawer/background showed duplicate brand links: omit the background
   header mark while the drawer is open, retaining drawer/home accessible names.
3. First gallery cut the comparison and captured a sticky header over the status
   badge: repositioned the actual page and verified badge bounds before capture.
   Rejected exports are private, not upload candidates.
4. A mobile drawer capture caught its opening transition: wait for its actual
   left edge to reach zero before capturing, without changing animation/timeouts.

## Fidelity and Acceptance

Typography, spacing, semantic colours and portal layout are preserved.
The added mark uses natural 1:1 proportions, stable dimensions and empty alt
beside the app name or inside explicitly labelled links. The previous SVG is
not used. Static walkthrough uses the existing neutral/teal palette, fine
dividers, modest headings and complete Light/Dark/System preferences.
Its form and persisted portal feedback are explicitly different experiences.

Targeted browser checks cover keyboard link operation, drawer Escape/focus
restoration, theme persistence, mobile width, account labels, real image bytes,
favicon and axe. Native 200% zoom verification is extended to the static
walkthrough in both themes; exact final results belong to the PR handoff.
Human screen-reader acceptance is **pending**, not inferred from axe.

Final visual result for the supplied mark and inspected gallery/walkthrough:
**passed**. Master/panel comparison is unavailable. Hosted test/security
conclusions and release approval remain separate from this visual result.
