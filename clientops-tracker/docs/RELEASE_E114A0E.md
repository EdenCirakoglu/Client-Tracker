# Published Release e114a0e

Verified on 6 November 2026. This evidence belongs only to main merge
`e114a0e64c9736b84db2fdb2d9ed330c650eb136` from PR #20, not to PR #31 or #22.
Earlier release and PR results retain their original revisions.

## Hosted Gates

- [Main push CI](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42261570457): passed at this exact SHA; 174 API tests, 28 helper tests, 12 browser scenarios, no skipped/unexpected/flaky browser results. Includes builds, migration generation, restricted roles, outages, backup/restore, deployment recovery, keyboard/axe and native zoom fixtures.
- [Automatic publication](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42263978821): both [API](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42263978821/job/128050912902) and [web](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42263978821/job/128050913207) jobs passed for the same SHA. No manual image publication was triggered.
- [Main browser artifact](https://github.com/EdenCirakoglu/Client-Tracker/actions/runs/42261570457/artifacts/13525537705): downloaded and SHA-256 matched `5d935dcd1d9cf55571f40ec6a82a66a2c0b831d21624ec9ddd54251f110b4237`. These are hosted source-build results, not the following local registry-image test.

## Immutable Images

Both images were resolved with `docker buildx imagetools inspect`, then pulled
by digest. Their OCI revision labels match the merge SHA. No API/web rebuild.

| Image                                      | Registry index digest                                                     | Linux/amd64 manifest digest                                               |
| ------------------------------------------ | ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `ghcr.io/edencirakoglu/client-tracker-api` | `sha256:3c2428c18872d03821f46673f3b1a93c28d5cf7e4949e382a7538b4c5be9a3db` | `sha256:76b6835c702492a5c625ffda5fe1651c2770b48053edcaef42453547d45a5247` |
| `ghcr.io/edencirakoglu/client-tracker-web` | `sha256:bfd78f0f60b7c90a64ffc3610cf521f6d6b0ed98ee8c14a714ed1b204b136502` | `sha256:ff6db590628e3a80cc4beb936ad38bb5ba48d8f642112f01f454004c8e651830` |

## Local Published-Image Results

Project `clientops-published-e114a0e64c97-tls-verified`, loopback HTTPS 8465,
private subnet `10.240.61.0/24`, uniquely namespaced PostgreSQL volume.
Only this new disposable database was seeded. Existing databases were preserved.

| Check                                                                    | Result                                                                                 |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Fresh migrations and repeat migration on populated data                  | Passed; no changed business records                                                    |
| API/web startup, Nginx, HTTPS and readiness                              | Passed using fixture CA and hostname validation                                        |
| Administrator and two client-organisation logins                         | Passed; Secure, HttpOnly, SameSite=Lax cookie                                          |
| Client creates ticket; public comment; staff internal note/status change | Passed; internal note excluded from client response                                    |
| Other organisation reads/comments; missing CSRF token                    | Denied                                                                                 |
| PostgreSQL stopped                                                       | Liveness 200; readiness/authenticated request 503; both recover after database startup |
| All containers removed/recreated, same new volume                        | Twelve-table fingerprint unchanged; ticket and session persist                         |
| Logout with saved-cookie replay                                          | Replay rejected with 401                                                               |

Report SHA-256: `c09c69507d214dd9f8f25fec2763a45811f89ff82ae95a0c3477f2b1b00e42d9`.
Business fingerprint before/after recreation:
`88ed7ef67956297361ffe78c8e9e039a4db837d6319f22cc7eaa518fd2682cd3`.
Counts: 2 clients, 4 users, 3 projects, 9 tickets, 7 comments, 11 ticket events,
2 releases, 4 triage suggestions; delivery/scope/summary tables empty in this
bounded fixture. Full delivery workflows are covered by source CI, not claimed
as exercised by this registry-image smoke test.

The initial host-side HTTPS attempt failed before login: local AVG inspection
replaced the generated certificate with an untrusted inspection certificate.
The failure report and initial volume were retained. The successful fresh fixture
ran HTTPS requests inside Docker with the generated CA and `localhost` hostname
verification. Certificate validation was not disabled; antivirus settings were
not changed. This is not trusted-public-HTTPS or host-browser acceptance.
An initial command had an incorrect relative harness path and failed before
executing; corrected below. No image/application failure was reproduced.

## Reproduction

Requires Docker Desktop Linux engine/Compose, Node 24, OpenSSL (Git for Windows
path is supported, or set `OPENSSL_PATH`), registry access and unused local
port/subnet. Run from `clientops-tracker` in a checkout containing the harness.
It has no build directive, refuses existing project volumes and generates
independent private fixture keys under ignored `test-results/tls/`.
Choose a new instance/port/subnet for a repeat; never delete existing databases.

```powershell
$env:RELEASE_INSTANCE = 'tls-verified'
$env:RELEASE_HTTPS_PORT = '8465'
$env:RELEASE_SUBNET = '10.240.61.0/24'
$env:RELEASE_HTTPS_TRANSPORT = 'container'
node scripts/verify-registry-release.mjs e114a0e64c9736b84db2fdb2d9ed330c650eb136 sha256:3c2428c18872d03821f46673f3b1a93c28d5cf7e4949e382a7538b4c5be9a3db sha256:bfd78f0f60b7c90a64ffc3610cf521f6d6b0ed98ee8c14a714ed1b204b136502
```

The executed local prototype's SHA-256 was
`c5ddebd53e8eb6b9231215f6e314361a269f3f219804cb6f20f2d967076845cc`;
the checked-in version is formatted for review. Result:
`test-results/clientops-published-e114a0e64c97-tls-verified/verification.json`.
Generated Compose configuration, private keys, cookies and database dumps must
not be published. Credentials pass on stdin/in memory, not command arguments.

Actual migration/recreation commands within the generated Compose configuration:

```text
docker compose -p <project> -f <private-compose.json> run --rm --no-deps api node dist/migrate.js
docker compose -p <project> -f <private-compose.json> up -d --no-build --wait
docker compose -p <project> -f <private-compose.json> down
docker compose -p <project> -f <private-compose.json> up -d --no-build --wait
```

`down` was used without `--volumes`. The database URL uses service hostname
`postgres`; no existing database address or volume was reused.

## Next Gate

PR #31 can now be verified against this main. Its fresh CI, CodeQL policy and
audit evidence must be recorded separately. No PR is merged by this verification
and no tooling risk is accepted. A future approved #31 main merge automatically
publishes API/web images after main CI; repeat exact-SHA main CI/publication and
digest-only runtime checks then.

No staging, deployment, real-recipient mail, public certificate renewal, human
screen-reader or customer acceptance is claimed. Migration 0007 and its older
worker incompatibility belong to the unmerged product increment, not this
release; do not deploy a mixed application/worker set.
