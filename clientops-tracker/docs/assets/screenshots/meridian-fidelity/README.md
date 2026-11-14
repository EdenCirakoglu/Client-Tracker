# Matched Meridian Fidelity Captures

These are real running-portal captures, not concept artwork. Historical Meridian
and portal screenshots remain untouched in their original directories.

- **Before:** `7814b669dece1f43862783ce9c31233c6230090a`, clean working tree: `true`, captured `2026-11-14T15:45:50.962Z`.
- **After:** `32971832f177cd3b5bb1cf3d792fc51244aa7eda`, clean working tree: `true`, captured `2026-11-14T15:51:04.739Z`.

Both sets use the same retained fictional data, production Next preview, isolated
Chrome profiles, DPR 1, reduced motion, scroll top and closed account/drawer menus.
Dashboard roles are Admin/Developer/Client. Ticket views use Client with scope R2
pending, R1 changes requested and no delivered outcome claimed. Desktop is
1440x1000; mobile 390x844. Expanded navigation is the default; filenames explicitly
identify collapsed desktop pairs. Mobile retains the closed drawer. Only the
`admin-dark-first-screen.png` is viewport-only; the other captures are full-page.

The application source in the before checkpoint is identical to `79c71b7`; only
the read-only capture harness changed. The after source is `3297183`. Later evidence
or documentation commits do not retroactively change screenshot attribution.
The original manifests retain role, viewport, theme, capture time and SHA-256.
Their global `sidebar` field describes the default, not collapsed filenames.
Per-capture route/sidebar metadata was accidentally passed to screenshot options
rather than the manifest; the final harness corrects that for future runs. The
original manifests are preserved. The following table uses the filenames and
asserted UI state from the original capture code; no recapture or relabelling is
claimed. No cookie, token, customer data or private environment is included.

## Review Pairs

| View                                                 | Before                                                                                        | After                                                                                        |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Admin, light, 1440, expanded, dashboard              | [dashboard-admin-light-1440.png](before/dashboard-admin-light-1440.png)                       | [dashboard-admin-light-1440.png](after/dashboard-admin-light-1440.png)                       |
| Admin, light, 390, expanded, dashboard               | [dashboard-admin-light-390.png](before/dashboard-admin-light-390.png)                         | [dashboard-admin-light-390.png](after/dashboard-admin-light-390.png)                         |
| Admin, dark, 1440, expanded, dashboard               | [dashboard-admin-dark-1440.png](before/dashboard-admin-dark-1440.png)                         | [dashboard-admin-dark-1440.png](after/dashboard-admin-dark-1440.png)                         |
| Admin, dark, 1440, expanded, dashboard, first screen | [admin-dark-first-screen.png](before/admin-dark-first-screen.png)                             | [admin-dark-first-screen.png](after/admin-dark-first-screen.png)                             |
| Admin, dark, 390, expanded, dashboard                | [dashboard-admin-dark-390.png](before/dashboard-admin-dark-390.png)                           | [dashboard-admin-dark-390.png](after/dashboard-admin-dark-390.png)                           |
| Developer, light, 1440, expanded, dashboard          | [dashboard-developer-light-1440.png](before/dashboard-developer-light-1440.png)               | [dashboard-developer-light-1440.png](after/dashboard-developer-light-1440.png)               |
| Developer, light, 390, expanded, dashboard           | [dashboard-developer-light-390.png](before/dashboard-developer-light-390.png)                 | [dashboard-developer-light-390.png](after/dashboard-developer-light-390.png)                 |
| Developer, dark, 1440, expanded, dashboard           | [dashboard-developer-dark-1440.png](before/dashboard-developer-dark-1440.png)                 | [dashboard-developer-dark-1440.png](after/dashboard-developer-dark-1440.png)                 |
| Developer, dark, 390, expanded, dashboard            | [dashboard-developer-dark-390.png](before/dashboard-developer-dark-390.png)                   | [dashboard-developer-dark-390.png](after/dashboard-developer-dark-390.png)                   |
| Client, light, 1440, expanded, dashboard             | [dashboard-client-light-1440.png](before/dashboard-client-light-1440.png)                     | [dashboard-client-light-1440.png](after/dashboard-client-light-1440.png)                     |
| Client, light, 1440, expanded, ticket review         | [ticket-client-light-1440.png](before/ticket-client-light-1440.png)                           | [ticket-client-light-1440.png](after/ticket-client-light-1440.png)                           |
| Client, light, 1440, collapsed, ticket review        | [ticket-client-light-1440-collapsed.png](before/ticket-client-light-1440-collapsed.png)       | [ticket-client-light-1440-collapsed.png](after/ticket-client-light-1440-collapsed.png)       |
| Client, light, 1440, collapsed, dashboard            | [dashboard-client-light-1440-collapsed.png](before/dashboard-client-light-1440-collapsed.png) | [dashboard-client-light-1440-collapsed.png](after/dashboard-client-light-1440-collapsed.png) |
| Client, light, 390, expanded, dashboard              | [dashboard-client-light-390.png](before/dashboard-client-light-390.png)                       | [dashboard-client-light-390.png](after/dashboard-client-light-390.png)                       |
| Client, light, 390, expanded, ticket review          | [ticket-client-light-390.png](before/ticket-client-light-390.png)                             | [ticket-client-light-390.png](after/ticket-client-light-390.png)                             |
| Client, dark, 1440, expanded, dashboard              | [dashboard-client-dark-1440.png](before/dashboard-client-dark-1440.png)                       | [dashboard-client-dark-1440.png](after/dashboard-client-dark-1440.png)                       |
| Client, dark, 1440, expanded, ticket review          | [ticket-client-dark-1440.png](before/ticket-client-dark-1440.png)                             | [ticket-client-dark-1440.png](after/ticket-client-dark-1440.png)                             |
| Client, dark, 1440, collapsed, ticket review         | [ticket-client-dark-1440-collapsed.png](before/ticket-client-dark-1440-collapsed.png)         | [ticket-client-dark-1440-collapsed.png](after/ticket-client-dark-1440-collapsed.png)         |
| Client, dark, 1440, collapsed, dashboard             | [dashboard-client-dark-1440-collapsed.png](before/dashboard-client-dark-1440-collapsed.png)   | [dashboard-client-dark-1440-collapsed.png](after/dashboard-client-dark-1440-collapsed.png)   |
| Client, dark, 390, expanded, dashboard               | [dashboard-client-dark-390.png](before/dashboard-client-dark-390.png)                         | [dashboard-client-dark-390.png](after/dashboard-client-dark-390.png)                         |
| Client, dark, 390, expanded, ticket review           | [ticket-client-dark-390.png](before/ticket-client-dark-390.png)                               | [ticket-client-dark-390.png](after/ticket-client-dark-390.png)                               |

## File Integrity

| File                                             | SHA-256                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| before/dashboard-admin-light-1440.png            | `59a403fede4a89aaf64898f93eda08359dfb256d87bbc8bdbe2d62428dee92d8` |
| before/dashboard-admin-light-390.png             | `7558dd73ac41e5b7a394ecc675a5b28980b684815c04fa7cc9e11b821fcd24e0` |
| before/dashboard-admin-dark-1440.png             | `cc5c1c4dcf298f9e1618cdd1d92dc2dd6288867629120db3e8038790979c893e` |
| before/admin-dark-first-screen.png               | `26f66f5834a6d368b4131c625244ccbec317db2a51c61bdf517320a4b0f1e960` |
| before/dashboard-admin-dark-390.png              | `002c4ac52c400e1b11d97b15cc7fa3bc71e1aa1704845d65892b1de563abce59` |
| before/dashboard-developer-light-1440.png        | `12940b725d240d877ffd6bc3547eca761c9813004f33c4939af260ce6de49681` |
| before/dashboard-developer-light-390.png         | `57aeb231db5202dfd26617f3c228dad35d3e183c18ce0b04e4dba02a548ac87d` |
| before/dashboard-developer-dark-1440.png         | `0bb76df1ac75db48b7c58eb309f3451ba39af9d19549546418e8742b4f5b0ddc` |
| before/dashboard-developer-dark-390.png          | `cfb5083657f092653a7f668eb8937eb56353b68a4e0c084c29063feb632be71f` |
| before/dashboard-client-light-1440.png           | `000f804318324f123baef7a12e6f17893c143051ee04e905b733543c606145d3` |
| before/ticket-client-light-1440.png              | `bab42a3e28e931032864673fc8c493ad479ed9e071a14a1ee794e8bc6c4fd712` |
| before/ticket-client-light-1440-collapsed.png    | `daaaf8adcdf9749c603a972c685ec3359a3699f2db6a851a4604a12494065c7e` |
| before/dashboard-client-light-1440-collapsed.png | `d906006ac167cead6f9273f79ff39809fa944bca88339488cdf9ac307cb11713` |
| before/dashboard-client-light-390.png            | `1c4e1fc4c8cdd1d67f77bd8533ead0580d7db0d854234b1a7465739f80c7b2b1` |
| before/ticket-client-light-390.png               | `5801bbc53590fe2502e29ebf1efa2b2887c3a873e21bc5a33f1d70251304b003` |
| before/dashboard-client-dark-1440.png            | `bbf8a252a532fd83180b8d705fb2d92628ced2ad734f80e5b8aaa816da0cc757` |
| before/ticket-client-dark-1440.png               | `640abb5a5c32e2b74b4f240363fa4202c35f7e8415929e671f9d08b5c6e4bfb4` |
| before/ticket-client-dark-1440-collapsed.png     | `2e8e6f744f5cc161ec1ec5edf407a54a1f4f21dd6a999fbe0b0b8ff55efdd561` |
| before/dashboard-client-dark-1440-collapsed.png  | `d4cfa9e5877e4c73de0c1f8415450b4b398d72f130d2750d3fef3c6711127a64` |
| before/dashboard-client-dark-390.png             | `a279e2795368d9d97880278518a59101d19455e8a6ddfc6a2761e25184aee935` |
| before/ticket-client-dark-390.png                | `d1b002ecd645dbf0ba02cf87e49b5ee1ced1f2781fb0313fa761afbafa977aa5` |
| after/dashboard-admin-light-1440.png             | `d2e6a85f0310089c8e1434afe317efb410e68e1bd36b117f154be898f27d7c20` |
| after/dashboard-admin-light-390.png              | `fc108ebb2667390ef2d60029999ff63dcbd055be0cabb471eb1d8509d899c4e7` |
| after/dashboard-admin-dark-1440.png              | `56eb8370f5a2621e7dcb6b149f127407fd629f9bae473f5c6bfa404c58de01e3` |
| after/admin-dark-first-screen.png                | `01c46f35b9c1d147f8ed78f34c6ddeda1036d369288e2508305b458b01414685` |
| after/dashboard-admin-dark-390.png               | `c820b88fe7bba5324f3b3956350fcca9256384e54f381ad780bc1a8608b8afab` |
| after/dashboard-developer-light-1440.png         | `bfef67657fe53f95a1a37ebaf72b8f8db360e5cb36917ae76e3681ff64185f9c` |
| after/dashboard-developer-light-390.png          | `cf3b618082268f5456a02a6e61bdbadc9bd6a918ce0276a487cf509ab07bbbed` |
| after/dashboard-developer-dark-1440.png          | `8423be4f41d8c89484bf9e9c50f230d9a29172b859a3bf593e1f87223b59f2ce` |
| after/dashboard-developer-dark-390.png           | `22562b4f9be20d6eea985025be4e78b152768294a01fecabb5e269347fb812bf` |
| after/dashboard-client-light-1440.png            | `6014979a943f480d990d4b057ff06ef527e5b0a213d560ef54c0817ce9bf2ef3` |
| after/ticket-client-light-1440.png               | `581874f6b1f5476a9e0790e0d78f371f198071451eecd96b452c7e528e90e920` |
| after/ticket-client-light-1440-collapsed.png     | `2c4a293776803e34625703be2eed73fc792e7639d7248493b345b75fb1f2047a` |
| after/dashboard-client-light-1440-collapsed.png  | `cd86a64c89fa251ed3edf4f42aa0cdc761ab15731ced099395fa980608bea73c` |
| after/dashboard-client-light-390.png             | `732d512642365e697151c6e7ed911bbd7982100e00b92a72c381c866d9fb3b1e` |
| after/ticket-client-light-390.png                | `d2cc22a29818c766cf032940dd08ff8d5b4bf79609222814dc6a006d2c9279a3` |
| after/dashboard-client-dark-1440.png             | `8282361edcc3d229f661b6e0e4ccb7c34b9b4da97029c92cbe71237ca48baf8b` |
| after/ticket-client-dark-1440.png                | `4ae8fa24368e1c1bc7877086b4e09cb435de977403ca134a9365cf71080a1cb9` |
| after/ticket-client-dark-1440-collapsed.png      | `61379ab0b23fdf4a4e2b0e072efe9697c6e44ae685d3da4b804b1900dd81d824` |
| after/dashboard-client-dark-1440-collapsed.png   | `a814246f8213395a42eadf8b1277c90e505d341894af27b3e3e010e50e2c8f3e` |
| after/dashboard-client-dark-390.png              | `050663d8ef9ec793a48c095c20e33ea169bb91289678cde49e81c258e840d676` |
| after/ticket-client-dark-390.png                 | `8f142d1deb7011bc29974adb04264099bb1426d8a91360946a15cfe6137927b3` |

## Reproduce

See [the reconciliation report](../../../MERIDIAN_SPEC_RECONCILIATION.md#evidence-and-reproduction)
for the read-only capture command and exact fixture requirements. Compare identical
filenames across directories; do not compare an expanded dashboard with a collapsed
ticket and attribute the width difference to CSS. The ticket is the retained
fictional `4e08c8ea-e7c4-4eda-acc9-37cb9418256a`. The original concept contains
unsupported sample capabilities and is not an acceptance oracle for real records.
