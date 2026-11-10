# Meridian Screenshot Evidence

The before/after pairs show the **same real fictional ticket**, client account,
collapsed sidebar and scroll-top position. No UI was painted into these PNGs.

- Before: application source `a227b164dbec2ab921425d49fa11ae4a770eaf2e`.
- After and scenario states: `0a4be4576b4d6187f8652fe2fde96eaec79075cc`.
- Captured from local Chrome using production-rendered Next.js for after images.
- Light/dark desktop: 1440x1000 CSS pixels, DPR 1; dark mobile: 390x844, DPR 1.
- Shared ticket: `87868da7-d5ec-498f-8cee-739e36b5d968`; scope revision 2 proposed,
  original and revision 1 retained. This record remains pending for preview.
- Confirmation and changes-requested captures use separate disposable test records.
  Confirmation is R2 pending; changes-requested is R3 after a stale-R2 attempt and
  a successful request for changes. Neither depicts delivery acceptance.
- Native zoom screenshot: Chrome Settings 200%, physical window 1440x1000;
  page CSS width 711, DPR 2, dialog scrolled to focused review checkbox. Not a
  matched normal-size comparison. Human screen-reader acceptance is pending.

| File                                                         | Caption / alt text                                                                        | SHA-256                                                            |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| [after-client-dark-1440.png](after-client-dark-1440.png)     | After: charcoal ticket review with Revision River, word changes and client decision rail. | `b64804f106921b52d601aa4becc5f8a77278edded69076befb23b74d7407ee2c` |
| [after-client-dark-390.png](after-client-dark-390.png)       | After: mobile River keeps current R2 visible; Review decision jumps to the action.        | `18c7a451311c589c553372aec65f6fef5dc13eaa05d3a5dcf9c1012b8b64ae4f` |
| [after-client-light-1440.png](after-client-light-1440.png)   | After: light review with separate ticket status and scope approval.                       | `d8cda38f334843e45fb62d8526d547abf7d6ca943b7717086b38dea40ab2bfc4` |
| [before-client-dark-1440.png](before-client-dark-1440.png)   | Before: existing dark ticket review with full proposal details.                           | `11d8a89a1e79172c3cc418aedf95783968ab82397611408cacb6def736744a5c` |
| [before-client-dark-390.png](before-client-dark-390.png)     | Before: existing narrow ticket layout.                                                    | `e8ba242c14b4823b74ec5dab2cc42fddb567c193a24b020eeea3a552029fc667` |
| [before-client-light-1440.png](before-client-light-1440.png) | Before: existing light ticket review.                                                     | `cddbe05f5eaff353eae021c4e145bfb6b428c05f1d689d108adbb54c5c98d133` |
| [native-200-dark.png](native-200-dark.png)                   | Native 200% zoom: focused review checkbox, readable terms and feedback field.             | `90bd75e625e66ee680dbc552b17b38e5e41053a4d91de66f05ddee37a129bfd8` |
| [scope-changes-requested.png](scope-changes-requested.png)   | Recorded R3 changes request with attribution and preserved earlier proposals.             | `12611fb15aba07b728f54b0318390d937bff6df5cf801cbd24a5d9b28ca71e2b` |
| [scope-confirmation.png](scope-confirmation.png)             | Client reviews exact R2 terms before recording a scope decision.                          | `7d8226641d44692aff3ea5ee5f3c32b61068333e8a2f5f02ed5cce3ad7bbac7f` |

Historical screenshots elsewhere are unchanged. The before images include the
development renderer; after images do not include Next's development indicator.
These are candidate evidence, not a claim that the published registry images
include Meridian. [Commands and results](../../../MERIDIAN_REVIEW.md).
