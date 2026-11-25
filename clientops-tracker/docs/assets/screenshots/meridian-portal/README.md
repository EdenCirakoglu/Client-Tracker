# Meridian Portal Captures

Actual running portal, fictional data, not concept artwork. Historical #37
captures remain in ../meridian unchanged. This selection adds matched full-page
pairs and one viewport-only first screen.

- Before: ae6d93ee8b52967a2e461676392c425fb4c1336c, inherited ticket-only Meridian
  candidate plus #36 CI reconciliation, before portal edits. Next development
  preview; the development indicator is real, not retouched.
- After: 304e02017ecab2310aec36cbc7020dced25b8709, clean worktree, production Next
  build. Later test/documentation-only commits do not relabel this source revision.
- Same local dataset, role, route (/dashboard), theme, viewport, expanded sidebar,
  DPR 1 and reduced motion. Capture time naturally differs. Full-page image height
  reflects the actual reading order and content length, not a different viewport.
- Same pending scope R2 on fictional ticket 4e08c8ea-e7c4-4eda-acc9-37cb9418256a:
  Find active and archived shipments by customer reference. No decision was
  submitted by the capture process. The screenshot script blocks non-login writes.
- [Before hashes and conditions](before/manifest.json),
  [after source, browser, conditions and SHA-256 hashes](after/manifest.json).

## First Screen

[Open the exact administrator first viewport](after/admin-dark-first-screen.png).
Sign in at the local dashboard with Continue as Admin and select Dark in the
account menu. This is a writable, explicitly disposable local preview, not the
public fictional walkthrough.

## Matched Pairs

| Role      | Theme | Viewport    | Before                                              | After                                             |
| --------- | ----- | ----------- | --------------------------------------------------- | ------------------------------------------------- |
| admin     | light | 1440 x 1000 | [Before](before/dashboard-admin-light-1440.png)     | [After](after/dashboard-admin-light-1440.png)     |
| admin     | light | 390 x 844   | [Before](before/dashboard-admin-light-390.png)      | [After](after/dashboard-admin-light-390.png)      |
| admin     | dark  | 1440 x 1000 | [Before](before/dashboard-admin-dark-1440.png)      | [After](after/dashboard-admin-dark-1440.png)      |
| admin     | dark  | 390 x 844   | [Before](before/dashboard-admin-dark-390.png)       | [After](after/dashboard-admin-dark-390.png)       |
| developer | light | 1440 x 1000 | [Before](before/dashboard-developer-light-1440.png) | [After](after/dashboard-developer-light-1440.png) |
| developer | light | 390 x 844   | [Before](before/dashboard-developer-light-390.png)  | [After](after/dashboard-developer-light-390.png)  |
| developer | dark  | 1440 x 1000 | [Before](before/dashboard-developer-dark-1440.png)  | [After](after/dashboard-developer-dark-1440.png)  |
| developer | dark  | 390 x 844   | [Before](before/dashboard-developer-dark-390.png)   | [After](after/dashboard-developer-dark-390.png)   |
| client    | light | 1440 x 1000 | [Before](before/dashboard-client-light-1440.png)    | [After](after/dashboard-client-light-1440.png)    |
| client    | light | 390 x 844   | [Before](before/dashboard-client-light-390.png)     | [After](after/dashboard-client-light-390.png)     |
| client    | dark  | 1440 x 1000 | [Before](before/dashboard-client-dark-1440.png)     | [After](after/dashboard-client-dark-1440.png)     |
| client    | dark  | 390 x 844   | [Before](before/dashboard-client-dark-390.png)      | [After](after/dashboard-client-dark-390.png)      |

## Reproduce

From clientops-tracker, with the existing isolated preview running:

```powershell
$env:VERIFY_URL = 'http://localhost:3082'
$env:E2E_ALLOW_DISPOSABLE_DEMO = 'true'
$env:BROWSER_CHANNEL = 'chrome'
$env:UI_EVIDENCE_DIR = 'test-results/meridian-portal-captures'
node scripts/capture-meridian-portal.mjs
```

Do not overwrite historical pairs with newly mutated data. Additional operational
route, denied/error and accepted-delivery captures are generated in the PR browser
artifacts, carrying their own tested revision. See [MERIDIAN_PORTAL](../../../MERIDIAN_PORTAL.md)
for results and the full route inventory. Human screen-reader acceptance is still
pending; screenshots and axe cannot establish it.
