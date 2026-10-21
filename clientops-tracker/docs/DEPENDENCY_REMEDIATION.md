# Dependency Remediation: Milestone 1B

## Provenance

Reviewed 2026-10-21. Base: PR #19 head
`7693de8131d9ea11dcff30dbd695219c64a4170d`, still draft/unmerged when checked.
Main remains `bc7eeaf131a606da39470ef9aec406a661eb7b08`.
This dependent review is not a release or deployment. PR #19's
[CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/39603815386)
and screenshots remain evidence only for that head.

Before: 37 advisory/range entries, **31 distinct GHSAs**. Six repeated entries
are different affected brace-expansion major ranges, not additional vulnerabilities.
Main's 32 open alerts also include duplicate Drizzle records (#1/#6) and fixes
already in PR #19: Next #61/#62, Nodemailer #49/#53/#54 and proxy-addr #63.
None was dismissed. PRs #14/#18 remain open pending an approved replacement merge.

After: **zero production audit findings; four distinct development findings remain**.
The full audit intentionally exits nonzero. This dated inventory is not a promise
that future audits stay clean. Owner review of residual build-tool risk is pending.

## Before/After Advisory Matrix

GHSA links are authoritative GitHub Advisory Database records. See the exact
path index below; peer duplicates do not represent separate issues.

| Advisory                                                                 | Package                  | Installed before | Affected range           | First patched range | Candidate                                       | Exposure / disposition                                                                        |
| ------------------------------------------------------------------------ | ------------------------ | ---------------- | ------------------------ | ------------------- | ----------------------------------------------- | --------------------------------------------------------------------------------------------- |
| [GHSA-67mh-4wv8-2f99](https://github.com/advisories/GHSA-67mh-4wv8-2f99) | esbuild                  | 0.18.20, 0.19.12 | <=0.24.2                 | >=0.25.0            | 0.25.12 / 0.28.2 fixed; 0.18.20 / 0.27.7 remain | Build/CLI only; dev server not enabled. See remaining decisions.                              |
| [GHSA-gpj5-g38j-94v9](https://github.com/advisories/GHSA-gpj5-g38j-94v9) | drizzle-orm              | 0.38.4           | <0.45.2                  | >=0.45.2            | 0.45.4                                          | API queries/migrator; current identifiers fixed/allowlisted, dependency still required patch. |
| [GHSA-qx2v-qp2m-jg93](https://github.com/advisories/GHSA-qx2v-qp2m-jg93) | postcss                  | 8.4.31           | <8.5.10                  | >=8.5.10            | 8.5.28 / 8.5.31                                 | Next compilation, not a CSS upload endpoint; scoped same-major override.                      |
| [GHSA-g7r4-m6w7-qqqr](https://github.com/advisories/GHSA-g7r4-m6w7-qqqr) | esbuild                  | 0.27.7, 0.28.0   | >=0.27.3 <0.28.1         | >=0.28.1            | 0.25.12 / 0.28.2 fixed; 0.18.20 / 0.27.7 remain | Build/CLI only; dev server not enabled. See remaining decisions.                              |
| [GHSA-hmw2-7cc7-3qxx](https://github.com/advisories/GHSA-hmw2-7cc7-3qxx) | form-data                | 4.0.5            | >=4.0.0 <4.0.6           | >=4.0.6             | 4.0.6                                           | Supertest/Superagent/type dependencies; no app multipart handler.                             |
| [GHSA-3jxr-9vmj-r5cp](https://github.com/advisories/GHSA-3jxr-9vmj-r5cp) | brace-expansion          | 1.1.15, 5.0.6    | <1.1.16; >=3.0.0 <5.0.7  | >=1.1.16; >=5.0.7   | 1.1.21 / 5.0.12                                 | ESLint/minimatch repository globbing.                                                         |
| [GHSA-52cp-r559-cp3m](https://github.com/advisories/GHSA-52cp-r559-cp3m) | js-yaml                  | 4.2.0            | >=4.0.0 <4.3.0           | >=4.3.0             | 4.3.2                                           | ESLint configuration loader; no user YAML API.                                                |
| [GHSA-395f-4hp3-45gv](https://github.com/advisories/GHSA-395f-4hp3-45gv) | shell-quote              | 1.8.4            | <=1.8.4                  | >=1.9.0             | 1.12.0                                          | Gel optional tooling dependency; no app shell handler.                                        |
| [GHSA-v422-hmwv-36x6](https://github.com/advisories/GHSA-v422-hmwv-36x6) | body-parser              | 1.20.5           | <1.20.6                  | >=1.20.6            | 1.20.8                                          | Express JSON middleware; literal 1mb limit already valid.                                     |
| [GHSA-6g55-p6wh-862q](https://github.com/advisories/GHSA-6g55-p6wh-862q) | postcss                  | 8.4.31           | <=8.5.11                 | >=8.5.12            | 8.5.28 / 8.5.31                                 | Next compilation, not a CSS upload endpoint; scoped same-major override.                      |
| [GHSA-mh99-v99m-4gvg](https://github.com/advisories/GHSA-mh99-v99m-4gvg) | brace-expansion          | 1.1.15, 5.0.6    | <1.1.17; >=4.0.0 <5.0.8  | >=1.1.17; >=5.0.8   | 1.1.21 / 5.0.12                                 | ESLint/minimatch repository globbing.                                                         |
| [GHSA-fxqj-rqcc-2cmp](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp) | postcss                  | 8.4.31           | <=8.5.22                 | >=8.5.23            | 8.5.28 / 8.5.31                                 | Next compilation, not a CSS upload endpoint; scoped same-major override.                      |
| [GHSA-rgw5-rvv9-x895](https://github.com/advisories/GHSA-rgw5-rvv9-x895) | brace-expansion          | 5.0.6, 1.1.15    | >=4.0.0 <5.0.9; <1.1.18  | >=5.0.9; >=1.1.18   | 1.1.21 / 5.0.12                                 | ESLint/minimatch repository globbing.                                                         |
| [GHSA-5p4m-2wfm-xmqj](https://github.com/advisories/GHSA-5p4m-2wfm-xmqj) | js-yaml                  | 4.2.0            | >=4.0.0 <4.3.1           | >=4.3.1             | 4.3.2                                           | ESLint configuration loader; no user YAML API.                                                |
| [GHSA-r28c-9q8g-f849](https://github.com/advisories/GHSA-r28c-9q8g-f849) | postcss                  | 8.4.31           | <=8.5.17                 | >=8.5.18            | 8.5.28 / 8.5.31                                 | Next compilation, not a CSS upload endpoint; scoped same-major override.                      |
| [GHSA-c83g-rgw3-j3cx](https://github.com/advisories/GHSA-c83g-rgw3-j3cx) | browserslist             | 4.28.2           | <=4.28.6                 | >=4.28.7            | 4.28.7                                          | Autoprefixer build configuration.                                                             |
| [GHSA-73wf-gq98-2v4g](https://github.com/advisories/GHSA-73wf-gq98-2v4g) | browserslist             | 4.28.2           | <=4.28.6                 | >=4.28.7            | 4.28.7                                          | Autoprefixer build configuration.                                                             |
| [GHSA-x5fp-wj9c-mxmx](https://github.com/advisories/GHSA-x5fp-wj9c-mxmx) | qs                       | 6.15.2           | >=6.14.2 <=6.15.3        | >=6.16.0            | 6.16.1                                          | Express query parser and test serialization; comma/stringify modes not used by API.           |
| [GHSA-4mjr-xmp4-gh2g](https://github.com/advisories/GHSA-4mjr-xmp4-gh2g) | qs                       | 6.15.2           | >=2.2.5 <6.16.0          | >=6.16.0            | 6.16.1                                          | Express query parser and test serialization; comma/stringify modes not used by API.           |
| [GHSA-w5vr-8v7q-w6rv](https://github.com/advisories/GHSA-w5vr-8v7q-w6rv) | baseline-browser-mapping | 2.10.38          | >=2.0.0 <2.11.0          | >=2.11.0            | 2.11.0                                          | Browserslist/Autoprefixer build configuration.                                                |
| [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh) | js-yaml                  | 4.2.0            | >=4.0.0 <4.3.2           | >=4.3.2             | 4.3.2                                           | ESLint configuration loader; no user YAML API.                                                |
| [GHSA-q2hr-2g5m-vwhr](https://github.com/advisories/GHSA-q2hr-2g5m-vwhr) | brace-expansion          | 1.1.15, 5.0.6    | <1.1.21; >=4.0.0 <5.0.12 | >=1.1.21; >=5.0.12  | 1.1.21 / 5.0.12                                 | ESLint/minimatch repository globbing.                                                         |
| [GHSA-qhr7-859c-m2p7](https://github.com/advisories/GHSA-qhr7-859c-m2p7) | brace-expansion          | 1.1.15, 5.0.6    | <1.1.20; >=4.0.0 <5.0.11 | >=1.1.20; >=5.0.11  | 1.1.21 / 5.0.12                                 | ESLint/minimatch repository globbing.                                                         |
| [GHSA-6j4f-fj2g-mc7p](https://github.com/advisories/GHSA-6j4f-fj2g-mc7p) | brace-expansion          | 1.1.15, 5.0.6    | <1.1.19; >=4.0.0 <5.0.10 | >=1.1.19; >=5.0.10  | 1.1.21 / 5.0.12                                 | ESLint/minimatch repository globbing.                                                         |
| [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | braces                   | 3.0.3            | <=3.0.3                  | <0.0.0              | 3.0.3 remains                                   | Next ESLint/Tailwind build globbing; unpatched.                                               |
| [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q) | source-map-js            | 1.2.1            | >=1.0.0 <1.2.2           | >=1.2.2             | 1.2.2                                           | PostCSS source-map compilation; no user source-map endpoint.                                  |
| [GHSA-rj75-hqrm-r3gf](https://github.com/advisories/GHSA-rj75-hqrm-r3gf) | postcss-selector-parser  | 6.1.4            | <7.1.6                   | >=7.1.6             | 6.1.4 remains                                   | Tailwind/postcss-nested repository CSS compilation.                                           |
| [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv) | shell-quote              | 1.8.4            | >=1.8.4 <1.11.0          | >=1.11.0            | 1.12.0                                          | Gel optional tooling dependency; no app shell handler.                                        |
| [GHSA-698v-4r3x-3vcv](https://github.com/advisories/GHSA-698v-4r3x-3vcv) | vite                     | 7.3.6            | >=7.0.0 <=7.3.6          | >=7.3.7             | 7.3.7                                           | Vitest dev runner, not Next production server.                                                |
| [GHSA-r825-w8mm-5pxw](https://github.com/advisories/GHSA-r825-w8mm-5pxw) | vite                     | 7.3.6            | >=7.0.0 <=7.3.6          | >=7.3.7             | 7.3.7                                           | Vitest dev runner, not Next production server.                                                |
| [GHSA-587h-7wmj-h5pm](https://github.com/advisories/GHSA-587h-7wmj-h5pm) | vite                     | 7.3.6            | >=7.0.0 <=7.3.6          | >=7.3.7             | 7.3.7                                           | Vitest dev runner, not Next production server.                                                |

## Affected Path Index (Before)

Exact PR #19 audit paths; only path separators normalized and repeated entries removed.

<details>
<summary>esbuild</summary>

- `apps/api > drizzle-kit@0.30.6 > @esbuild-kit/esm-loader@2.6.5 > @esbuild-kit/core-utils@3.3.2 > esbuild@0.18.20`
- `apps/api > drizzle-kit@0.30.6 > esbuild@0.19.12`
- `apps/api > drizzle-kit@0.30.6 > esbuild-register@3.6.0 > esbuild@0.19.12`
- `apps/api > tsup@8.5.1 > bundle-require@5.1.0 > esbuild@0.27.7`
- `apps/api > tsup@8.5.1 > esbuild@0.27.7`
- `apps/api > tsup@8.5.1 > postcss-load-config@6.0.1 > tsx@4.22.4 > esbuild@0.28.0`
- `apps/api > tsx@4.22.4 > esbuild@0.28.0`
- `apps/api > vite@7.3.6 > esbuild@0.28.0`
- `apps/api > vite@7.3.6 > tsx@4.22.4 > esbuild@0.28.0`
- `apps/api > vitest@4.1.11 > @vitest/mocker@4.1.11 > vite@7.3.6 > esbuild@0.28.0`
- `apps/api > vitest@4.1.11 > @vitest/mocker@4.1.11 > vite@7.3.6 > tsx@4.22.4 > esbuild@0.28.0`
- `apps/api > vitest@4.1.11 > vite@7.3.6 > esbuild@0.28.0`
- `apps/api > vitest@4.1.11 > vite@7.3.6 > tsx@4.22.4 > esbuild@0.28.0`
- `apps/web > tailwindcss@3.4.19 > postcss-load-config@6.0.1 > tsx@4.22.4 > esbuild@0.28.0`

</details>

<details>
<summary>drizzle-orm</summary>

- `apps/api > drizzle-orm@0.38.4`

</details>

<details>
<summary>postcss</summary>

- `apps/web > next@15.5.28 > postcss@8.4.31`

</details>

<details>
<summary>form-data</summary>

- `apps/api > @types/supertest@6.0.3 > @types/superagent@8.1.10 > form-data@4.0.5`
- `apps/api > supertest@7.2.2 > superagent@10.3.0 > form-data@4.0.5`

</details>

<details>
<summary>brace-expansion</summary>

- `. > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > eslint-config-prettier@9.1.2 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > eslint-config-prettier@9.1.2 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > eslint-config-prettier@9.1.2 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > eslint@9.39.4 > @eslint/config-array@0.21.2 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > eslint@9.39.4 > minimatch@3.1.5 > brace-expansion@1.1.15`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/parser@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5 > brace-expansion@5.0.6`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5 > brace-expansion@5.0.6`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > @typescript-eslint/utils@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5 > brace-expansion@5.0.6`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/utils@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5 > brace-expansion@5.0.6`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/parser@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5 > brace-expansion@5.0.6`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5 > brace-expansion@5.0.6`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/utils@8.61.0 > @typescript-eslint/typescript-estree@8.61.0 > minimatch@10.2.5 > brace-expansion@5.0.6`

</details>

<details>
<summary>js-yaml</summary>

- `. > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > eslint-config-prettier@9.1.2 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/type-utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/eslint-plugin@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/parser@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > @typescript-eslint/utils@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`
- `. > typescript-eslint@8.61.0 > eslint@9.39.4 > @eslint/eslintrc@3.3.5 > js-yaml@4.2.0`

</details>

<details>
<summary>shell-quote</summary>

- `apps/api > drizzle-kit@0.30.6 > gel@2.2.0 > shell-quote@1.8.4`

</details>

<details>
<summary>body-parser</summary>

- `apps/api > express@4.22.2 > body-parser@1.20.5`
- `apps/api > express-rate-limit@8.7.0 > express@4.22.2 > body-parser@1.20.5`
- `apps/api > swagger-ui-express@5.0.1 > express@4.22.2 > body-parser@1.20.5`

</details>

<details>
<summary>browserslist</summary>

- `apps/web > autoprefixer@10.5.0 > browserslist@4.28.2 > update-browserslist-db@1.2.3 > browserslist@4.28.2`

</details>

<details>
<summary>qs</summary>

- `apps/api > express@4.22.2 > body-parser@1.20.5 > qs@6.15.2`
- `apps/api > express@4.22.2 > qs@6.15.2`
- `apps/api > express-rate-limit@8.7.0 > express@4.22.2 > body-parser@1.20.5 > qs@6.15.2`
- `apps/api > express-rate-limit@8.7.0 > express@4.22.2 > qs@6.15.2`
- `apps/api > swagger-ui-express@5.0.1 > express@4.22.2 > body-parser@1.20.5 > qs@6.15.2`
- `apps/api > swagger-ui-express@5.0.1 > express@4.22.2 > qs@6.15.2`
- `apps/api > supertest@7.2.2 > superagent@10.3.0 > qs@6.15.2`

</details>

<details>
<summary>baseline-browser-mapping</summary>

- `apps/web > autoprefixer@10.5.0 > browserslist@4.28.2 > baseline-browser-mapping@2.10.38`

</details>

<details>
<summary>braces</summary>

- `. > @next/eslint-plugin-next@15.5.28 > fast-glob@3.3.1 > micromatch@4.0.8 > braces@3.0.3`
- `apps/web > tailwindcss@3.4.19 > chokidar@3.6.0 > braces@3.0.3`
- `apps/web > tailwindcss@3.4.19 > fast-glob@3.3.3 > micromatch@4.0.8 > braces@3.0.3`
- `apps/web > tailwindcss@3.4.19 > micromatch@4.0.8 > braces@3.0.3`

</details>

<details>
<summary>source-map-js</summary>

- `apps/api > tsup@8.5.1 > postcss-load-config@6.0.1 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/api > tsup@8.5.1 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/api > vite@7.3.6 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/api > vitest@4.1.11 > @vitest/mocker@4.1.11 > vite@7.3.6 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/api > vitest@4.1.11 > vite@7.3.6 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/web > next@15.5.28 > postcss@8.4.31 > source-map-js@1.2.1`
- `apps/web > autoprefixer@10.5.0 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/web > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/web > tailwindcss@3.4.19 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/web > tailwindcss@3.4.19 > postcss-import@15.1.0 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/web > tailwindcss@3.4.19 > postcss-js@4.1.0 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/web > tailwindcss@3.4.19 > postcss-load-config@6.0.1 > postcss@8.5.28 > source-map-js@1.2.1`
- `apps/web > tailwindcss@3.4.19 > postcss-nested@6.2.0 > postcss@8.5.28 > source-map-js@1.2.1`

</details>

<details>
<summary>postcss-selector-parser</summary>

- `apps/web > tailwindcss@3.4.19 > postcss-nested@6.2.0 > postcss-selector-parser@6.1.4`
- `apps/web > tailwindcss@3.4.19 > postcss-selector-parser@6.1.4`

</details>

<details>
<summary>vite</summary>

- `apps/api > vite@7.3.6`
- `apps/api > vitest@4.1.11 > @vitest/mocker@4.1.11 > vite@7.3.6`
- `apps/api > vitest@4.1.11 > vite@7.3.6`

</details>

## Selection and Compatibility

- [Express 4.22.3](https://github.com/expressjs/express/releases/tag/v4.22.3)
  explicitly updates qs to ~6.16.0; body-parser ~1.20.5 accepts 1.20.8, which
  also takes qs ~6.16.0. No parsing override or middleware change.
- [Drizzle ORM 0.45.4](https://github.com/drizzle-team/drizzle-orm/releases/tag/0.45.4)
  includes the identifier fix from 0.45.2; its latest change concerns postgres-js,
  whereas this application uses node-postgres.
  [Kit 0.31.11](https://github.com/drizzle-team/drizzle-orm/releases/tag/drizzle-kit%400.31.11)
  adds migration-skip warnings. Narrow minor ranges avoid beta/1.0 upgrades.
- [Vite 7.3.7](https://github.com/vitejs/vite/releases/tag/v7.3.7) resolves the
  newly observed Windows editor advisories within the existing Vite major.
- Other patched copies are lock-only resolutions within existing parent ranges.
  Temporary exact resolution constraints were removed after generating the
  lockfile; no blanket override remains for those packages.
- The sole retained override is `next@15.5.28>postcss: 8.5.31`. Next still pins
  8.4.31; updating the workspace's separate PostCSS copy does not repair it.
  PostCSS stays on major 8. Both builds pass; the complete browser/axe suite is
  the additional compatibility gate. Remove the override when a supported Next
  patch selects fixed PostCSS itself, then rerun frozen install, audit, builds
  and browser tests. Reassess at every Next upgrade; the selector deliberately
  covers only the reviewed Next version. Owner: repository maintainer.
- Platform esbuild packages and peer snapshot keys change with their host
  packages, not as unrelated upgrades. No schema, proxy setting, JSON limit,
  route, rate limit or CSRF behavior changes. Malformed/oversized JSON retains
  the existing sanitized generic 500 envelope; improving those HTTP status
  semantics is separate API contract work.

## Remaining Decisions (Not Fixed)

Owner for all four: repository maintainer. **Customer launch remains gated on
owner review of residual build-tool risks**, not a misleading zero-total-audit
claim. No identified production dependency advisory remains in this candidate.
Never expose development/tooling servers on customer-facing interfaces.

| Finding / exact current path                                                                                                                                                                                    | Available remediation                     | Exposure and precise next action                                                                                                                                                                        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GHSA-67mh-4wv8-2f99: api > drizzle-kit@0.31.11 > @esbuild-kit/esm-loader@2.6.5 > @esbuild-kit/core-utils@3.3.2 > esbuild@0.18.20                                                                                | >=0.25.0, outside the loader's 0.18 range | Deprecated loader retained by stable Kit; build/CLI only, no serve call. Review temporary acceptance or a supported loader-free Kit upgrade, not a blind transitive override.                           |
| GHSA-g7r4-m6w7-qqqr: api > tsup@8.5.1 > esbuild@0.27.7 (also bundle-require@5.1.0 peer)                                                                                                                         | >=0.28.1; tsup 9 selects ^0.28.2          | Windows esbuild development server; this application invokes build, not serve. Review acceptance or separately scoped tsup 9 migration. Vite/tsx copies are patched.                                    |
| GHSA-rj75-hqrm-r3gf: web > tailwindcss@3.4.19 > postcss-selector-parser@6.1.4; also postcss-nested@6.2.0                                                                                                        | >=7.1.6                                   | Tailwind 3 requires ^6.1.2. Parser 7 changes insertion-during-iteration behavior. Repository CSS only. Review acceptance or explicit Tailwind/parser compatibility work; do not silently force major 7. |
| GHSA-vfj7-8cjw-p6xm: root > @next/eslint-plugin-next@15.5.28 > fast-glob@3.3.1 > micromatch@4.0.8 > braces@3.0.3; web > tailwindcss@3.4.19 > chokidar@3.6.0 / fast-glob@3.3.3 / micromatch@4.0.8 > braces@3.0.3 | No patch in advisory                      | Trusted build glob patterns only. Review acceptance, monitor upstream and prohibit untrusted pattern compilation. No audit ignore or fabricated fix.                                                    |

ESLint 9.39.4 is marked end-of-support by upstream. This is a lifecycle item,
not an additional CVE silently fixed here. Plan a compatible ESLint 10
configuration/plugin review separately. Tests passing do not fix these findings.

## CodeQL Recheck

Alerts #1 (CSRF) and #3 (clear-text cookie) remain open. Re-read `app.ts`,
`routes/auth.ts`, `middleware/session.ts` and `config/env.ts`: session-bound
csrf-sync middleware precedes all /api business/auth routers; unsafe requests
also check Origin. Public health/docs precede it. No exemption or validation
override was added. Missing/invalid/cross-session/foreign-origin token regressions
remain. The existing query-model limitation classification is retained, not a
dismissal. Owner approval remains required for alert disposition.

Production sets HttpOnly, Secure, SameSite=Lax and the \_\_Host- cookie prefix,
rejects HTTP origins, and verifies attributes in HTTPS browser tests. HTTP
cookies are confined to non-production configuration. Trusted public HTTPS and
operator acceptance are still required. Tests alone do not close either alert.

## Verification and Reproduction

Run from `clientops-tracker/` using Node 24 and pnpm 9.15.4. Final revision-specific
results and artifact links belong in the remediation PR handoff. PR #19's results
are not substituted for the new revision. CI retains all browser/accessibility,
database/SMTP outage, restricted-grant, encrypted-backup, populated-restore and
deployment failure coverage. Added gates: runtime audit and unchanged generation.

```powershell
$env:TEST_PG_PORT='15435'
$env:TEST_SMTP_PORT='11027'
$env:TEST_MAIL_PORT='18027'
docker compose -p clientops-dependency-1b -f docker-compose.hardening-test.yml up -d --wait
$env:TEST_DATABASE_URL='postgresql://clientops_test:disposable_test_password@127.0.0.1:15435/clientops_hardening_test'
$env:DISPOSABLE_DATABASE_NAME='clientops_hardening_test'
$env:SMTP_PORT='11027'
$env:MAILPIT_URL='http://127.0.0.1:18027'
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:verification
pnpm build
pnpm format:check
node scripts/check-migration-generation.mjs
pnpm audit --prod
pnpm audit --json
```

Public disposable credentials above are never customer configuration. On this
workstation automatic Docker subnets were exhausted; a separate network
`clientops-dependency-1b_default` was allocated at 10.240.51.0/24 after checking
existing networks. No pruning or reuse of previous volumes occurred.

Before changing ORM, cloned the populated disposable test database:

```text
docker exec clientops-dependency-1b-postgres-1 createdb -U clientops_test -T clientops_hardening_test clientops_dependency_upgrade_test
```

Set DATABASE_URL (and MIGRATION_DATABASE_URL for migrations) to the separate
upgrade database on port 15435. Ran `pnpm --filter @clientops/api db:fingerprint`,
upgraded ORM, ran `pnpm --filter @clientops/api db:migrate`, then fingerprint again.
Both returned `5b777edfe18fa1a1548bbd3fadc5a49d470b24bd451e13ba15f0aeb28d83cbee`.
Preserved: 2 clients, 4 users, 3 projects, 8 tickets, 5 comments, 6 events,
2 releases, 3 suggestions. No reseed during upgrade. This fixture has no
delivery/scope/summary rows; populated workflow restore coverage is separately
exercised by the full hosted operational suite.

Migration generation checks a temporary copy, explicit success output and
unchanged files; Kit can otherwise exit zero after printing an error. All seven
historical migrations/snapshots remain unchanged. Identifier regression checks
delimiter escaping and value parameters. Existing race, decision, tenant and
workflow tests verify real queries. Locally: 166 API tests, 26 helpers, lint,
typecheck, both builds and frozen install passed before the review checkpoint.

Hosted CI and its clean installation are pending until the new PR head completes.
No new image publication, customer/public deployment or real-recipient email.
