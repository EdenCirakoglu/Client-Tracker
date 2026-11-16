# Meridian Composition Evidence

This is real local application evidence for draft PR #43, not a public release or
an assertion of owner visual acceptance. The original concept remains a design
reference, not a running product screen. Historical captures are unchanged.

## Start Here

| View                                                      | Before                                                  | After                                                 |
| --------------------------------------------------------- | ------------------------------------------------------- | ----------------------------------------------------- |
| Admin first screen, dark, expanded, 1440x1000             | [Before](before/admin-dark-first-screen.png)            | [After](after/admin-dark-first-screen.png)            |
| Client scope review, dark, collapsed, 1440x1000           | [Before](before/ticket-client-dark-1440-collapsed.png)  | [After](after/ticket-client-dark-1440-collapsed.png)  |
| Client scope review, light, collapsed, 1440x1000          | [Before](before/ticket-client-light-1440-collapsed.png) | [After](after/ticket-client-light-1440-collapsed.png) |
| Developer assigned work, light, 1440x1000                 | [Before](before/dashboard-developer-light-1440.png)     | [After](after/dashboard-developer-light-1440.png)     |
| Empty personal decision / active requests, light, 390x844 | [Before](before/dashboard-emptyclient-light-390.png)    | [After](after/dashboard-emptyclient-light-390.png)    |
| Changes requested, dark, 390x844                          | [Before](before/ticket-changes-dark-390.png)            | [After](after/ticket-changes-dark-390.png)            |

## Revisions and Conditions

- Before: `8ebccd7f8bca1da53c53bd4b26c1125eae755b96`, clean detached worktree.
  Application source is unchanged from `74d7c63`; the intervening changes are the
  read-only capture harness and its settled-read correction.
- After: `7f1699097fb4f283dc7da824654df7f52582246f`, clean review worktree.
  Application source is `31fde615b722edfc4f1561ceee264af364ecff65`; the following
  commit records the review and checklist.
- Both use production Next rendering at `http://localhost:3082`, the same real
  loopback API, retained fictional database and records. No business mutations ran
  between these two captures. The API was not restarted to bypass a rate limit.
- 33 pairs: roles Admin, Developer, Northstar Client and Bluewave EmptyClient;
  Light/Dark; 1440x1000 and 390x844; DPR 1; scroll 0; reduced motion. Sidebar is
  expanded except filenames containing `collapsed`; mobile uses the closed drawer.
- Full-page PNGs except `admin-dark-first-screen.png`, which is exactly 1440x1000.
  Full-page height is content-driven; viewport and scroll are matched, not cropped
  to disguise additional content. Updated-at labels naturally have different times.
- All 66 image hashes and all 33 role/route/viewport/theme/sidebar/scroll/motion
  pairs were checked programmatically. Manifests include computed fonts and surfaces.

| Manifest                       | SHA-256                                                            |
| ------------------------------ | ------------------------------------------------------------------ |
| [Before](before/manifest.json) | `7e75927442deb440c72443788bb8e517360619e7cb461a208740fa679e74922f` |
| [After](after/manifest.json)   | `72416b438a4cd260f80acb1cb9a9db9ea0ade98b14603c2f9f94219708d43c4c` |

JSON manifests contain the original capture data, formatted with repository
Prettier. These checksums refer to the committed copies; PNG bytes are unchanged.
Their image entries give filenames, source conditions and hashes.

## Real Fictional States

| Record                        | ID                                     | State shown                                                                      |
| ----------------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| Shipment scope                | `4e08c8ea-e7c4-4eda-acc9-37cb9418256a` | R1 changes requested; R2 proposed; designated Northstar contact can decide       |
| Delivered shipment search     | `744d8874-81c8-4f19-b686-22f350ee3d61` | Ticket resolved; release `1.5.0-meridian-review`; outcome R1 awaiting acceptance |
| Active shipment still missing | `7cef6856-e97d-45a1-81de-3deb5ae2b88f` | Ticket resolved and release delivered, but client requested changes for NS-1042  |
| Bluewave contact              | `bluewave@example.com`                 | No personal decisions; three active requests; first actionable request shown     |

The retained disposable database also contains fictional regression records. It
was not wiped for a marketing capture. No real customer data, credentials, reset
links, session values or private configuration appear in these images/manifests.

## Inspection and Automated Checks

Manually inspected: matched Admin first-screen dark and Developer light desktop
pairs; final scope-review light desktop; changes-requested dark mobile; empty-client
light mobile; native-200 dark keyboard focus. Earlier iteration inspection also
covered client pending-decision mobile, delivered light desktop, project workspace
and published mobile summary. Not all 66 final PNGs were manually inspected.

The first developer iteration had excessive whitespace. The three-record preview
corrected it while retaining full totals and filtered View all. The chosen teal
tonal surface remains opaque and stationary. Real history and evidence remain
longer than the illustrative concept. No unsupported SLA, release gate or signature
has been introduced.

[Native 200% report](validation/portal-native-200.json): 20 page/drawer checks across
three roles and both themes, fresh Chrome profiles, real browser Settings zoom,
axe, keyboard focus containment/restoration and Escape. This is automated browser
acceptance, not a human screen-reader walkthrough.

- [Keyboard focus at native 200%, Admin dark](validation/portal-native-200-admin-dark-navigation.png)
- [Client dashboard at native 200%, light](validation/portal-native-200-client-light-dashboard.png)
- [Current served-assets/font inspection](validation/preview-inspection.json)
- [Historical restored-build inspection](validation/preview-inspection-before.json)

The final preview build ID is `oiyEjsZDSVJse0WnKnyHL`. Ten served CSS/JS asset hashes
match the rebuilt source output. Body is Geist 14px/21.7px; statement is Instrument
Serif 40px; short label is JetBrains Mono 11px; sidebar 232px; reading radius 18px.
Dark capture styles confirm the preserved `#1d2120` canvas.

## Reproduce

Keep the existing loopback-only preview/API and disposable database running.
From the application workspace:

```powershell
$env:VERIFY_URL = 'http://localhost:3082'
$env:BROWSER_CHANNEL = 'chrome'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:CAPTURE_TICKET_ID = '4e08c8ea-e7c4-4eda-acc9-37cb9418256a'
$env:CAPTURE_DELIVERED_ID = '744d8874-81c8-4f19-b686-22f350ee3d61'
$env:CAPTURE_CHANGES_ID = '7cef6856-e97d-45a1-81de-3deb5ae2b88f'
$env:CAPTURE_EMPTY_CLIENT = 'true'
$env:UI_EVIDENCE_DIR = 'test-results/meridian-composition/review-capture'
node scripts/capture-meridian-portal.mjs
$env:UI_EVIDENCE_DIR = 'test-results/meridian-composition/review-zoom'
node scripts/verify-portal-zoom.mjs
```

Each role signs in once; capture otherwise only reads existing records. IDs above
belong to this retained disposable fixture, not any production database. Allow the
normal auth window to expire between repeated large matrices; honor 429 and its
Retry-After rather than resetting limits. Failed earlier local capture manifests
remain local and are not represented by these passing artifacts.

Owner visual-fidelity acceptance, human screen-reader testing, inherited security
decisions and real-service acceptance remain pending. See the
[composition review](../../../MERIDIAN_COMPOSITION_REVIEW.md) for scope, commands,
route coverage and limitations; final-head CI and full file inventory are in PR #43.
