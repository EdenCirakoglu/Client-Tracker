# Deployment and Local Stack Verification

Public deployment is a separate operator-controlled step. No public server, domain
or trusted TLS certificate is claimed by this document. See
[release evidence](RELEASE_READINESS.md) for checks actually performed.

## Paths and Addresses

The Git root contains `.github/workflows/`; the workspace is `clientops-tracker/`.
All Compose commands below run inside the workspace.

| Context                      | Database address                           |
| ---------------------------- | ------------------------------------------ |
| Host development process     | `localhost:5432/clientops_demo`            |
| Host automated tests         | `localhost:55434/clientops_hardening_test` |
| API/migration inside Compose | `postgres:5432/<POSTGRES_DB>`              |

`localhost` inside a container refers to that container, not PostgreSQL.
The production database has no published host port. Do not run a host-side migration
with a URL containing `postgres`. Use the migration executable inside the API image.

## Isolated Local Production-Style Run

Docker Desktop and OpenSSL must be available. The current hardening runbook uses
two separate HTTPS projects/volumes on loopback ports 8443/8444. Older port-8180/8181
evidence and volumes are preserved; their JWT-era configuration is not the current
session startup procedure.

```powershell
cd "C:\Users\PnP\Desktop\Client Tracker\clientops-tracker"
pnpm.cmd verify:stack
```

The script seeds only a new, explicitly disposable fixture using the old verified
image, then checks that additive upgrades preserve business records without
reseeding. A second empty fixture exercises real bootstrap with demo mode off.
See [SESSION_HARDENING.md](SESSION_HARDENING.md) for browser/email tests and reports.

Open:

- Frontend: https://localhost:8443/login
- API liveness: https://localhost:8443/api/health
- Swagger: https://localhost:8443/api/docs/

To verify persistence, create a ticket and comment, compare business fingerprints,
restart only the hardening fixture, wait for health, and reopen the ticket:

```powershell
function dc { docker compose -p clientops-hardening --env-file .env.hardening.example -f docker-compose.hardening.yml @args }
node scripts/hardening-stack.mjs snapshot
dc restart
dc up -d --no-build --wait
node scripts/hardening-stack.mjs snapshot
```

Compare the per-table hashes when nobody is writing data. `dc down` stops this stack
without deleting its named volume. Never use `down -v` on a database you need.

`config --quiet` validates configuration only. Successful builds, migrations,
healthy containers, browser workflows and restart checks are separate evidence.

## Image Contract

Images are `ghcr.io/<lowercase-owner>/<lowercase-repo>-api:<full-commit-sha>` and
`...-web:<full-commit-sha>`. The defaults match
`ghcr.io/edencirakoglu/client-tracker-api` and `client-tracker-web`.
Forks override `GHCR_OWNER` and `GHCR_REPOSITORY`.

Images use Node.js 24 LTS and pnpm 9.15.4; API and web run as the non-root `node`
user. The API image includes `dist/migrate.js` and the reviewed `drizzle/` migrations.

The web image is built with `NEXT_PUBLIC_API_URL=/` and routes API requests through
the current origin's Nginx proxy. No domain-specific browser rebuild is needed for
this configuration. If using a separate absolute API origin, pass it as a build
argument and rebuild; changing a runtime environment variable cannot change an
already compiled browser bundle. See [Next.js environment documentation](https://nextjs.org/docs/pages/guides/environment-variables).

## DigitalOcean Ubuntu VPS

The following is an unexecuted deployment runbook, not evidence of a cloud deployment.

1. Create an Ubuntu 24.04 LTS x86-64 Droplet and install your SSH public key.
   Use enough RAM for the running services; build images in CI instead of on a small VPS.
2. Configure a DigitalOcean cloud firewall: SSH only from trusted administration
   addresses, web ports only for the chosen HTTPS entry point, no 5432/3000/8080.
   Docker-published ports can bypass UFW; do not rely on UFW alone.
3. Install Docker using its [official Ubuntu apt instructions](https://docs.docker.com/engine/install/ubuntu/),
   including the signed repository, `docker-ce`, `docker-ce-cli`, `containerd.io`,
   `docker-buildx-plugin`, and `docker-compose-plugin`. Do not pipe an unreviewed
   remote script into a root shell.
4. Create an operator account and checkout. Docker group access is root-equivalent:

```bash
sudo apt-get update
sudo apt-get install -y git ca-certificates openssl
sudo adduser deploy
sudo usermod -aG docker deploy
sudo install -d -o deploy -g deploy /opt/clientops
```

Configure the deploy user's `~/.ssh/authorized_keys` with the deployment public key
and reconnect as that user so group changes take effect. Do not copy private keys
to the VPS.

```bash
docker version
docker compose version
git clone https://github.com/EdenCirakoglu/Client-Tracker.git /opt/clientops
cd /opt/clientops/clientops-tracker
umask 077
cp .env.production.example .env.production
openssl rand -hex 32
openssl rand -hex 32
nano .env.production
chmod 600 .env.production
```

Use the two independently generated values for the database password and session secret.
Do not paste real secrets into issue reports, workflow logs or screenshots.
Keep the PostgreSQL password in `DATABASE_URL` consistent with `POSTGRES_PASSWORD`;
URL-encode non-hex passwords. Never source an env file as shell code.

## Required Production Configuration

| Variable                                            | Meaning                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `GHCR_OWNER`, `GHCR_REPOSITORY`                     | Lowercase registry coordinates                                              |
| `IMAGE_TAG`                                         | Full commit SHA whose CI and image publication succeeded                    |
| `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` | Unique database identity; do not use a disposable suffix                    |
| `DATABASE_URL`                                      | Connection URL using `postgres:5432`, not localhost                         |
| `SESSION_SECRET`                                    | Independently generated signing secret, at least 32 characters              |
| `APP_ORIGIN`                                        | Exact public HTTPS origin, no trailing slash                                |
| `SESSION_IDLE_SECONDS`, `SESSION_ABSOLUTE_SECONDS`  | Server expiry defaults: 1800 and 28800                                      |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`             | Real mail transport; STARTTLS required when not using implicit TLS          |
| `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM`           | SMTP credentials and verified sender address                                |
| `TLS_CERTS_DIR`                                     | Directory with trusted `fullchain.pem` and `privkey.pem`, mounted read-only |
| `HTTPS_PORT`                                        | Normally 443; the public origin must match                                  |
| `NEXT_PUBLIC_API_URL`                               | `/` for the supplied same-origin image                                      |
| `HTTP_BIND`, `HTTP_PORT`                            | Default loopback listener; expose only behind an approved HTTPS entry point |

The API rejects placeholder session secrets and non-HTTPS production origins. Real env files
are ignored by Git and excluded from Docker build contexts. No production defaults
are used for database credentials.

## First Deployment

Wait for CI and image publication for the reviewed commit. Authenticate to GHCR for
private packages using a read-packages token; public packages can be pulled without
a login. Then run as the deploy user:

```bash
cd /opt/clientops
git fetch origin main
git status --short
# Set this to a reviewed full SHA; do not type the literal placeholder.
export IMAGE_TAG=REVIEWED_FULL_COMMIT_SHA
git merge-base --is-ancestor "$IMAGE_TAG" origin/main
git checkout --detach "$IMAGE_TAG"
cd clientops-tracker
dc() { docker compose -p clientops-production --env-file .env.production -f docker-compose.prod.yml "$@"; }
dc config --quiet
dc pull
dc up -d --wait postgres
dc run --rm --no-deps api node dist/migrate.js
dc up -d --no-build --wait
dc ps
curl --fail https://YOUR_CONFIGURED_DOMAIN/api/health
```

An empty database has no users. Run the one-time administrator bootstrap described
in [SESSION_HARDENING.md](SESSION_HARDENING.md#non-demo-bootstrap-and-manual-acceptance)
after migration; do not run demo seeds. Configure production SMTP, sender-domain
verification and trusted certificates **before** starting the public stack.

`nginx/production.conf` redirects HTTP to HTTPS and reads operator-managed
certificates from `TLS_CERTS_DIR`. It overwrites forwarding headers; the API trusts
one private proxy hop and publishes no port. Default listeners remain loopback;
set HTTP_BIND to the intended interface only after firewall/TLS review. Certificate
issuance and renewal automation are not provisioned here. If adding another proxy,
review the trust boundary instead of blindly forwarding client-supplied headers.
The local self-signed harness does not verify production TLS or SMTP delivery.

Swagger currently publishes the contract without authentication; data routes still
require server sessions. Gate `/api/docs` at the public edge if that contract should
not be public. Never advertise a public demo while default accounts are installed.

## Later Updates and Recovery

Take a database backup first and verify the proposed migrations. Reuse the exact
same Compose project name to retain the volume.

```bash
umask 077
mkdir -p "$HOME/clientops-backups"
dc exec -T postgres sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > "$HOME/clientops-backups/$(date -u +%Y%m%dT%H%M%SZ).sql"
# Check out the new reviewed SHA at the Git root as above and export IMAGE_TAG.
dc pull
dc run --rm --no-deps api node dist/migrate.js
dc up -d --no-build --wait
dc up -d --no-deps --force-recreate --wait nginx
dc ps
```

The Nginx recreation resolves any new container addresses. Keep backups private and
off the VPS; exercise a restore on a separate database. Rolling back images does not
roll back migrations. Do not automatically undo a database migration on deployment
failure; inspect logs and recover deliberately.

## GitHub Actions

Workflow files are at the Git root, not inside the workspace.

- CI runs install, lint, typecheck, formatting, migration, isolated tests, build,
  both Compose validations, and browser/accessibility checks against a freshly
  upgraded disposable HTTPS stack plus a separately bootstrapped account stack.
  It uploads browser reports/screenshots and upgrade hashes, excluding TLS keys.
- Docker Images publishes only a revision with successful `main` CI, tags both
  images with its full SHA, and builds the web image for same-origin requests.
- Deploy to DigitalOcean is manual, checks successful CI for the requested SHA,
  uses the protected `production` environment and serializes deployments.
  It verifies the SSH host fingerprint, refuses a dirty server checkout, verifies
  the SHA is on main, checks out that revision, pulls images, migrates inside the
  Compose network and restarts services. It never installs Node/pnpm on the host
  or seeds production.

Configure required reviewers and a main-only deployment branch policy on the
`production` GitHub environment. Approval enforcement depends on your GitHub plan
and repository settings; a YAML environment name alone does not enforce it.

Production environment secrets:

- `DO_HOST`: VPS address
- `DO_USERNAME`: dedicated deployment user
- `DO_SSH_PRIVATE_KEY`: dedicated private key
- `DO_SSH_FINGERPRINT`: trusted SHA-256 SSH host fingerprint, obtained from the VPS
  console with `ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub -E sha256`
- `GHCR_USERNAME`: registry reader
- `GHCR_TOKEN`: read-packages token

Production environment variable:

- `DO_APP_DIR=/opt/clientops`: Git checkout root, not the nested pnpm workspace

No `NEXT_PUBLIC_API_URL` GitHub variable is needed for same-origin images.
GitHub supplies the publishing workflow's `GITHUB_TOKEN`; do not create your own.

## Troubleshooting

| Symptom                                 | Check                                                                                                            |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| No package.json                         | Enter `clientops-tracker/` before pnpm commands                                                                  |
| Docker daemon unavailable               | Start Docker Desktop locally, or inspect the Docker service on Ubuntu                                            |
| Address already in use                  | Inspect `docker ps`; change the verification `HTTP_PORT`, not an existing service                                |
| GHCR manifest unknown                   | Wait for both image jobs for that SHA; verify lowercase image coordinates                                        |
| Permission denied pulling               | Authenticate with a read-packages token and check package visibility                                             |
| Database connection refused             | Use host address for local Node, `postgres` only inside Compose                                                  |
| Relation does not exist                 | Run `dc run --rm --no-deps api node dist/migrate.js`                                                             |
| Database auth fails after env edit      | Existing volumes retain original credentials; env edits do not rotate them                                       |
| Browser calls localhost:8080 from VPS   | Rebuild web with `NEXT_PUBLIC_API_URL=/`; a runtime edit is insufficient                                         |
| CORS failure                            | Match exact origin; same-origin Nginx needs no cross-origin browser exception                                    |
| 502 after replacing containers          | Check `dc logs --tail=100 api web nginx`, then recreate Nginx                                                    |
| Test command refuses configuration      | Copy `apps/api/.env.test.example` to `.env.test` and start the separate test cluster                             |
| Seed refuses reset                      | Only an explicitly designated `clientops_*demo`/`clientops_*test` DB, with `SEED_RESET=true`, outside production |
| Failed login after production migration | Bootstrap once on a new database, then invite accounts; demo identities are rejected                             |

Inspect `dc logs --tail=100` privately. Prefer `config --quiet` because plain
`config` prints resolved environment values. Do not delete volumes to fix an auth
or migration problem. Keep local checks, hosted CI, runtime verification and public
deployment status separate in release notes.

## Trusted TLS Inspection During Local Builds

If an organisation proxy or antivirus intercepts HTTPS, Node inside Docker may not
trust the certificate that Windows already trusts. Verify the issuer against your
existing trusted root store; never trust an arbitrary downloaded certificate.
Export only the public CA as PEM to a local ignored directory, then run:

```powershell
$env:BUILD_CA_FILE=(Resolve-Path '../artifacts/avg-root.pem').Path
pnpm.cmd verify:stack
```

The optional override mounts the public CA as a BuildKit secret only during npm/pnpm
installation. It is not copied into runtime images or committed. GitHub-hosted
builds normally do not need this override. Do not set `strict-ssl=false` or
`NODE_TLS_REJECT_UNAUTHORIZED=0`. On Windows, `NODE_OPTIONS=--use-system-ca` lets
Node.js use the existing OS trust store for host-side package downloads.
