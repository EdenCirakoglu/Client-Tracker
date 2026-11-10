# Meridian Design QA

final result: passed

## Comparison Conditions

Source visual truth: the two Meridian concept images supplied in the implementation
request, with the user's explicit lighter-charcoal correction. The main concept
was 3200x2000 (displayed at 1996x1248); the IA image 2800x1520 (displayed at
2048x1112). They are supporting references, not screenshots of existing features.
No pixel-perfect equivalence is claimed: the real record contains R0/R1/R2, not
the reference's invented R3 draft, fake SLA and signature.

Implementation checkpoint: `0a4be4576b4d6187f8652fe2fde96eaec79075cc`.
Rendered in isolated Chrome from the Next production preview and real Express API.
Matched before/after evidence uses the same fictional shipment ticket, client role,
collapsed navigation, scroll top, 1440x1000 desktop and 390x844 mobile, DPR 1.
Before source: `a227b164dbec2ab921425d49fa11ae4a770eaf2e`; before captures were made
with development rendering, after captures with production rendering.
No historical capture was overwritten.

## Evidence Inspected

- `docs/assets/screenshots/meridian/before-client-dark-1440.png`
- `docs/assets/screenshots/meridian/after-client-dark-1440.png`
- Matching light desktop and dark mobile pairs in the same directory.
- `scope-confirmation.png`: 1440x1000, exact R2 review, checkbox, separate consequences.
- `scope-changes-requested.png`: 1440x1000, persisted R3 decision, earlier proposals retained.
- `native-200-dark.png`: actual 200% browser zoom, dialog scrolled to focused checkbox.

Full-view inspection covered hierarchy, framing, inherited branding and layout.
Focused inspection covered the River nodes and current marker, semantic diff words,
approval controls, feedback and focus ring. The concept and live screenshots were
inspected as separate references; no manufactured overlay or matching pixel score
is claimed. Full-height mobile and both-theme 200% captures also remain in local
test-results; the curated review set avoids duplicate screen states.

## Iterations and Findings

1. The first implementation repeated full proposal details before the diff.
   The comparison now leads, with complete terms in a disclosure and decision facts
   beside it on desktop. Mobile stacks fields and exposes a Review decision link.
2. Selecting R0 as a baseline silently hid scope comparisons. Stored proposal
   revisions now take precedence; R0 is explicitly the original request, not an approval.
3. Desktop-to-mobile resizing left the selected River node off-screen. A bounded
   horizontal ResizeObserver scroll now keeps it visible. The final browser suite
   asserts its full horizontal bounds at 390/768/1280/1440 widths.
4. A redundant Back to tickets link consumed space beneath the existing breadcrumb.
   Removed; header navigation remains. Final desktop capture shows the decision
   action and the start of the scope diff in the first viewport.
5. No remaining actionable clipping, page overflow, obstructed focus or illegible
   decision controls were reproduced in the inspected states. The River intentionally
   scrolls horizontally on narrow screens; the actual diff does not require it.

## Fidelity Surfaces

| Surface    | Checked result                                                                                                                                           |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Typography | Self-hosted Instrument Serif display, Geist UI, JetBrains Mono metadata; fixed responsive sizes, normal tracking, no remote font dependency              |
| Layout     | 24px review grid gap, bounded desktop decision rail, single-column mobile, native dialog scroll; no fake application-shell redesign                      |
| Colour     | Lighter charcoal canvas/panels, restrained teal/jade actions, labelled additions/removals and status; axe contrast checks passed in both themes          |
| Assets     | Existing v3 raster logo preserved unmodified; existing Lucide icons; no generated replacement logo or concept artwork presented as live UI               |
| Copy       | Real records and actors, explicit estimated effort, fresh revision agreement, separate scope/delivery/acceptance; no SLA/signature/inbox-delivery claims |

## Functional and Accessibility Checks

All three focused Playwright scenarios passed together on the checkpoint. Checks
cover keyboard River navigation, URL/back/reload, both diff modes, comparison route,
modal focus containment/Escape/restoration, approval checkbox, feedback errors,
stale revision rejection, retry, duplicate-submit prevention and tenant denial.
Axe passed at four widths in light/dark. Native Chrome zoom measured DPR 1 to 2 and
CSS width 1422 to 711; focused controls remain visible and page overflow is absent.

Human screen-reader acceptance and independent first-visit usability are pending,
not implied by these checks. No screenshot is a claim of public deployment.

## Follow-up

The broader IA reference includes unsupported global search, notifications, SLA
and workspace switching. These are intentionally absent, not decorative controls.
Keep future dashboard/summary refinements separately scoped. See
[review evidence and commands](docs/MERIDIAN_REVIEW.md).
