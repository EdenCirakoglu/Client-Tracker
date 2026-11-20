# Published Release: cfec6e71

Verified locally on 2026-11-08, after PR #31 merged. This is new evidence for
`cfec6e71a51975e224a2cee9ddda2238183b8b31`, not a relabelled prior rehearsal.

- [Main CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42269883427): success.
- [Docker Images](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42273339327):
  API job 128083261199 and web job 128083261508 both succeeded at this SHA.
- API: `ghcr.io/edencirakoglu/client-tracker-api@sha256:be22ef9713ce2f61816828900aff2aacc423dc8e0a74d1621cd5709941163d22`.
- Web: `ghcr.io/edencirakoglu/client-tracker-web@sha256:21f48c3107310bfd644a41b284825b62449b09ee23c06d03ffd4486230b9a96a`.
- Both pulled images' OCI `org.opencontainers.image.revision` labels equal the full main SHA.
- No application image was rebuilt. The existing registry harness at that SHA was used.

## Exact Reproduction

Run from `clientops-tracker` with Docker Desktop's Linux engine running,
Node.js and OpenSSL (Git for Windows supplies the documented default).
Choose an unused project suffix, loopback port and subnet on another machine.
The harness refuses an existing project volume; it never resets that volume.

```powershell
$env:RELEASE_INSTANCE='20261108'
$env:RELEASE_HTTPS_PORT='8467'
$env:RELEASE_SUBNET='10.240.64.0/24'
$env:RELEASE_HTTPS_TRANSPORT='container'
node scripts/verify-registry-release.mjs cfec6e71a51975e224a2cee9ddda2238183b8b31 sha256:be22ef9713ce2f61816828900aff2aacc423dc8e0a74d1621cd5709941163d22 sha256:21f48c3107310bfd644a41b284825b62449b09ee23c06d03ffd4486230b9a96a
```

Exit 0. Project `clientops-published-cfec6e71a519-20261108`, private database
`clientops_published_cfec6e71a519_demo`, new persistent volume. All existing
development/verification databases were preserved. Docker was initially stopped;
starting Desktop resolved that host prerequisite before running the harness.
Container HTTPS transport checks the fixture CA and localhost hostname, avoiding
host antivirus TLS interception without disabling certificate verification.

## Results

| Check                                                     | Actual result                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------- |
| Initial and populated repeat migration                    | Passed; existing business fingerprint unchanged                     |
| Web, proxy, process and database readiness                | Passed                                                              |
| Admin and two client-organisation logins                  | Passed; Secure, HttpOnly, SameSite cookies                          |
| Client ticket, public reply, internal note, status change | Passed                                                              |
| Other organisation read/comment attempts                  | Denied; internal comment hidden from client                         |
| Missing CSRF proof                                        | Denied                                                              |
| PostgreSQL outage                                         | Liveness 200; readiness/authentication 503; recovered after restart |
| Full container recreation                                 | Twelve-table fingerprint, ticket and session preserved              |
| Logout replay                                             | Copied old cookie rejected                                          |

Machine-readable evidence:
`test-results/clientops-published-cfec6e71a519-20261108/verification.json`.
Harness SHA-256: `d927b26ee9558eca4e1afd426b94773bd733008da146b29bc2ce257ea44252d4`.
Business fingerprint: `84c13e8295b544ec0ad62c58e891a2faf6784a5f9c1a9f15038b5f77e3a290ad`.
The safe report is retained in [release evidence](evidence/cfec6e71-registry.json).

The fingerprint covers twelve tables; delivery/scope/summary tables were empty
in this bounded maintenance-image rehearsal. It does not claim PR #22's product
workflow, browser accessibility, restricted-role conversion, real SMTP, trusted
public HTTPS, external services or customer acceptance. These remain separate.
CodeQL alerts #1 and #3 remain open; runtime checks do not dispose of them.
Earlier [e114a0e evidence](RELEASE_E114A0E.md) retains its original revision.
