import { execFileSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Immutable baseline fixture. No local builds, development volumes or public listeners.
const operationsRelease = process.argv.includes('--release=7eba339');
const releaseName = operationsRelease ? '7eba339' : 'bdc749';
const revision = operationsRelease
  ? '7eba339b37a2aa948ef4f6ed019d268816d4ec99'
  : 'bdc749421187c017f4cc3ba36b2b9ef1d09fda80';
const images = operationsRelease
  ? {
      api: 'ghcr.io/edencirakoglu/client-tracker-api@sha256:f89b550bd3c3166ee4be56a9a8d6a64950f53b7482edc65394a313ca66e512df',
      web: 'ghcr.io/edencirakoglu/client-tracker-web@sha256:780012866bcf3ac9a3155290ff3d3ad7ab14019c7b22d851629f90eddaf2cb39',
    }
  : {
      api: 'ghcr.io/edencirakoglu/client-tracker-api@sha256:c3e3c6e4e0d0166e54c734f29bd9270ba4fdaa8a4649ed052b1539a12da36e83',
      web: 'ghcr.io/edencirakoglu/client-tracker-web@sha256:1d81853b12c29c73ac402160d6fff05d76a4fd71fbb84434730587a178059f79',
    };
const dir = resolve(`test-results/release-${releaseName}`);
const privateDir = operationsRelease ? resolve(`test-results/tls/release-${releaseName}`) : dir;
mkdirSync(dir, { recursive: true });
mkdirSync(privateDir, { recursive: true });
const command = (exe, args, capture = false) =>
  execFileSync(exe, args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
  })?.trim();
const openssl =
  process.env.OPENSSL_PATH ??
  (process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl');
const cert = resolve(privateDir, 'tls/cert.pem');
mkdirSync(resolve(privateDir, 'tls'), { recursive: true });
let renew = !existsSync(cert) || !existsSync(resolve(privateDir, 'tls/key.pem'));
if (!renew) {
  try {
    command(openssl, ['x509', '-checkend', '86400', '-noout', '-in', cert], true);
  } catch {
    renew = true;
  }
}
if (renew)
  command(openssl, [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '7',
    '-keyout',
    resolve(privateDir, 'tls/key.pem'),
    '-out',
    cert,
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ]);
const secretFile = resolve(privateDir, 'session-secret');
if (!existsSync(secretFile))
  writeFileSync(secretFile, randomBytes(48).toString('hex'), { mode: 0o600 });
const mailKeyFile = resolve(privateDir, 'mail-key');
if (operationsRelease && !existsSync(mailKeyFile))
  writeFileSync(mailKeyFile, randomBytes(32).toString('hex'), { mode: 0o600 });
const probe = (url) => ({
  test: [
    'CMD',
    'node',
    '-e',
    `fetch('${url}').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`,
  ],
  interval: '3s',
  timeout: '5s',
  retries: 40,
});
const tables = [
  'clients',
  'users',
  'projects',
  'tickets',
  'ticket_comments',
  'ticket_events',
  'releases',
  'triage_suggestions',
];
const action = process.argv[2] ?? 'start';
const evidence = {
  revision,
  images,
  action,
  harnessRevision: command('git', ['rev-parse', 'HEAD'], true),
  workingTreeDirty: !!command('git', ['status', '--porcelain'], true),
  timestamp: new Date().toISOString(),
  fixtures: [],
};
for (const accounts of [false, true]) {
  const project = `clientops-release-${releaseName}${accounts ? '-accounts' : ''}`;
  const database = `clientops_release_${releaseName}${accounts ? '_accounts' : ''}_demo`;
  const port = (operationsRelease ? 8454 : 8450) + Number(accounts);
  const config = resolve(privateDir, `${project}.json`);
  const environment = {
    NODE_ENV: 'production',
    DATABASE_URL: `postgresql://hardening:local_disposable_database_password@postgres:5432/${database}`,
    SESSION_SECRET: readFileSync(secretFile, 'utf8'),
    APP_ORIGIN: `https://localhost:${port}`,
    TRUST_PROXY: '1',
    DEMO_MODE: String(!accounts),
    DISPOSABLE_DATABASE_NAME: database,
    SMTP_MODE: 'capture',
    SMTP_HOST: 'mailpit',
    SMTP_PORT: '1025',
    ...(operationsRelease
      ? { DEPLOYMENT_MODE: 'disposable', MAIL_ENCRYPTION_KEY: readFileSync(mailKeyFile, 'utf8') }
      : {}),
  };
  writeFileSync(
    config,
    JSON.stringify({
      services: {
        postgres: {
          image: 'postgres:16-alpine',
          environment: {
            POSTGRES_USER: 'hardening',
            POSTGRES_PASSWORD: 'local_disposable_database_password',
            POSTGRES_DB: database,
          },
          volumes: ['postgres_data:/var/lib/postgresql/data'],
          healthcheck: {
            test: ['CMD-SHELL', `pg_isready -U hardening -d ${database}`],
            interval: '2s',
            timeout: '3s',
            retries: 40,
          },
        },
        mailpit: {
          image: 'axllent/mailpit:v1.27.4',
          ports: [`127.0.0.1:${(operationsRelease ? 8034 : 8030) + Number(accounts)}:8025`],
        },
        api: {
          image: images.api,
          environment,
          healthcheck: probe(`http://127.0.0.1:8080/health${operationsRelease ? '/ready' : ''}`),
          depends_on: {
            postgres: { condition: 'service_healthy' },
            mailpit: { condition: 'service_started' },
          },
        },
        web: {
          image: images.web,
          environment: { NEXT_PUBLIC_API_URL: '/' },
          healthcheck: probe('http://127.0.0.1:3000/login'),
          depends_on: { api: { condition: 'service_healthy' } },
        },
        nginx: {
          image: 'nginx:stable-alpine',
          ports: [`127.0.0.1:${port}:443`],
          volumes: [
            `${resolve('nginx/hardening.conf')}:/etc/nginx/conf.d/default.conf:ro`,
            `${resolve(privateDir, 'tls')}:/etc/nginx/tls:ro`,
          ],
          depends_on: {
            api: { condition: 'service_healthy' },
            web: { condition: 'service_healthy' },
          },
        },
      },
      volumes: { postgres_data: {} },
    }),
    { mode: 0o600 },
  );
  const compose = (args, capture = false) =>
    command('docker', ['compose', '-p', project, '-f', config, ...args], capture);
  const sql = (query) =>
    compose(
      ['exec', '-T', 'postgres', 'psql', '-U', 'hardening', '-d', database, '-Atc', query],
      true,
    );
  const snapshot = () =>
    Object.fromEntries(
      tables.map((table) => [
        table,
        sql(
          `SELECT count(*) || ':' || md5(coalesce(string_agg(to_jsonb(t)::text, '' ORDER BY id), '')) FROM ${table} t`,
        ),
      ]),
    );
  if (action === 'start') {
    compose(['pull', 'api', 'web']);
    for (const image of Object.values(images)) {
      const inspected = JSON.parse(command('docker', ['image', 'inspect', image], true))[0];
      if (inspected.Config.Labels['org.opencontainers.image.revision'] !== revision)
        throw new Error('Image revision mismatch');
    }
    compose(['up', '-d', '--wait', 'postgres', 'mailpit']);
    const exists =
      sql(
        "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='tickets'",
      ) === '1';
    const before = exists ? snapshot() : null;
    compose(['run', '--rm', '--no-deps', 'api', 'node', 'dist/migrate.js']);
    if (before && JSON.stringify(before) !== JSON.stringify(snapshot()))
      throw new Error('Migration modified business records');
    if (!accounts && tables.every((table) => sql(`SELECT count(*) FROM ${table}`) === '0'))
      compose([
        'run',
        '--rm',
        '--no-deps',
        '-e',
        'NODE_ENV=development',
        '-e',
        'SEED_RESET=true',
        'api',
        'node',
        'dist/seed.js',
      ]);
    if (accounts && sql("SELECT count(*) FROM users WHERE role='ADMIN'") === '0')
      compose([
        'run',
        '--rm',
        '--no-deps',
        '-e',
        'BOOTSTRAP_NAME=Fictional Workspace Owner',
        '-e',
        'BOOTSTRAP_EMAIL=owner@accounts.example',
        '-e',
        'BOOTSTRAP_PASSWORD=Local-owner-passphrase-42',
        'api',
        'node',
        'dist/bootstrap.js',
      ]);
    compose(['up', '-d', '--no-build', '--wait']);
    if (renew) compose(['restart', 'nginx']);
    evidence.fixtures.push({ project, database, port, snapshot: snapshot() });
  } else if (action === 'persistence') {
    const before = snapshot();
    compose(['down']);
    compose(['up', '-d', '--no-build', '--wait']);
    const after = snapshot();
    if (JSON.stringify(before) !== JSON.stringify(after))
      throw new Error('Business records changed after recreation');
    evidence.fixtures.push({ project, before, after, result: 'unchanged' });
  } else if (action === 'snapshot') evidence.fixtures.push({ project, snapshot: snapshot() });
  else
    throw new Error('Use start, snapshot or persistence. No reset or volume deletion is provided.');
}
writeFileSync(resolve(dir, `${action}.json`), JSON.stringify(evidence, null, 2));
console.log(
  `Published release ${revision}: ${action} passed; evidence in test-results/release-${releaseName}/${action}.json`,
);
