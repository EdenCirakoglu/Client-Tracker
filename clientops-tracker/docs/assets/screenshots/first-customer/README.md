# First-Customer Portal Captures

Real locally built application, fictional data, isolated Chrome, 2026-11-10.
Not a public deployment, a static mockup or published-image feature evidence.
All selected images were visually inspected for loading states, clipping, overlays
and private information. Original historical screenshots remain unchanged.

Before source: `a1691ccc3b059dc0c4427e655f4cbadff048ba9c` (parent UI, fixture-only change).
After source: `8d805122ad11eea7f217bd77d9d0958e25b1d610`; API/web code unchanged
from `012fd5910814fa9aedfce8e671d28a577b3ce876`. Subsequent evidence-only commits do
not relabel these captures. The focused customer scenario passed after capture fixes.

The before/after pair uses the same Nina Demo Reviewer account, Harbor Agency
(Fictional), no project, `/tickets/new`, 390x844 viewport, light theme, full-page
capture. It demonstrates the prerequisite moved before the form with a guide link.
Developer/staff overview totals changed as the preserved fixture gained records;
they are not misrepresented as a matched empty-workspace comparison.

Other screenshots are the fresh Harbor Shipment Portal cases in
`e2e/first-customer.spec.ts`: acceptance and requested changes are **different tickets**.
The numeric organisation suffix is a test-run identifier, not customer information.
The first recorded setup decision is outcome agreement, not necessarily acceptance.
SMTP acceptance does not claim inbox receipt. No target date is invented.

| File / alt text                                                                                                     | Role          | Viewport / capture                                                         | SHA-256                                                            |
| ------------------------------------------------------------------------------------------------------------------- | ------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [before-client-no-project.png](before-client-no-project.png): request form before guidance                          | Client        | 390x844, full page, light, before                                          | `36d4c3e5b2b4ebf95b69c121ba337733d3d6bcd9226cf97fb735abcfdc6bea41` |
| [after-client-no-project.png](after-client-no-project.png): project prerequisite and next actor before request form | Client        | 390x844, full page, light                                                  | `52a15226b8e7bd455d413b2c18cac6176716672ed98af80d1b255db13a035ae7` |
| [admin-invited.png](admin-invited.png): invitation recorded but reviewer not active                                 | Administrator | 1440x1000, full page, light                                                | `2de9db4030d15a24753327b86cc67a90a22cc79f0ec41bd6e8f123a016f61f8e` |
| [admin-active-reviewer.png](admin-active-reviewer.png): activated contact is eligible for this client               | Administrator | 1440x1000, full page, light                                                | `f698bfabe8e04e51632736e6df43b467cdc04d7800bd663169c8bf07ff4b526c` |
| [developer-guide.png](developer-guide.png): assigned work to delivery-review guidance                               | Developer     | 1440x1000, full page, light                                                | `c720e6e500607ca91185850f61c1f80ee51d011184b501e531a95f4773e3ec30` |
| [client-guide-mobile.png](client-guide-mobile.png): request and decision guide on mobile                            | Client        | 390x844, full page, light                                                  | `0973991d8983b41bf197a66737ffee482c62039bdbb10765e876eff9051e40dc` |
| [client-accepted.png](client-accepted.png): acceptance persisted after sign-in; ticket remains open                 | Client        | 1440x1000, full page, light                                                | `4af7ee7e5a59c566f69513c2e2114e901a687fc3bc30e27ed121c6bd7cca802e` |
| [client-changes-mobile.png](client-changes-mobile.png): NS-1042 feedback and developer next action                  | Client        | 390x844, full page, light                                                  | `4287430e757ac464f6101b7b7a98a468fb25adea03ff4e3600cc7686e52577d2` |
| [admin-completed-dark.png](admin-completed-dark.png): six selected-client steps recorded                            | Administrator | 1440x1000, full page, dark, return visit                                   | `f3e27c33044a35faa34fc7ff0fd9c79cf3cb65da98a27ae2a6fb4429e66806aa` |
| [guide-200-percent.png](guide-200-percent.png): guide with native browser zoom                                      | Administrator | Chrome window 1440x1000; content width 711 CSS px, DPR 2, viewport capture | `cf7f5fda534d386fbc22e807f9790aa30f01d4f7c0c035a235c780515e387650` |

Full-page screenshots start at scroll top so the sticky header is not composited
across an anchored record. This corrects capture framing, not a demonstrated live
layout defect. Native zoom evidence is [recorded separately](../../../evidence/customer-ui-acceptance.json).
Automated axe/keyboard/zoom are not a human screen-reader or first-time usability study.
Those results remain pending in the [task card](../../../FIRST_CUSTOMER_TASK_CARD.md).
