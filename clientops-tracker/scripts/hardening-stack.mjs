import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// This runbook only manages these two named loopback fixtures, never development volumes.
const root = process.cwd();
const legacy =
  'ghcr.io/edencirakoglu/client-tracker-api@sha256:0e500d2bde8d2dc055d106befede3b1edb78becfd211cf6d46bbbc088487be6d';
const baseEnv = {
  ...process.env,
  HARDENING_DATABASE: 'clientops_hardening_demo',
  HTTPS_PORT: '8443',
  MAIL_PORT: '8025',
  DEMO_MODE: 'true',
  SESSION_SECRET: 'local_7a63af495caf28e6a280bcd13949726b5507afacefe37491',
};
const accountsEnv = {
  ...baseEnv,
  HARDENING_DATABASE: 'clientops_accounts_demo',
  HTTPS_PORT: '8444',
  MAIL_PORT: '8026',
  DEMO_MODE: 'false',
  SESSION_SECRET: 'local_29a7f021c06e9272ad63182be3a7fa9fbe11b049e07953ef',
};
function run(command, args, env = baseEnv, capture = false) {
  return execFileSync(command, args, {
    cwd: root,
    env,
    stdio: capture ? ['ignore', 'pipe', 'inherit'] : 'inherit',
    encoding: 'utf8',
  })?.trim();
}
function compose(accounts, args, capture = false) {
  return run(
    'docker',
    [
      'compose',
      '-p',
      accounts ? 'clientops-accounts' : 'clientops-hardening',
      '--env-file',
      '.env.hardening.example',
      '-f',
      'docker-compose.hardening.yml',
      ...args,
    ],
    accounts ? accountsEnv : baseEnv,
    capture,
  );
}
function snapshot() {
  return Object.fromEntries(
    [
      'clients',
      'users',
      'projects',
      'tickets',
      'ticket_comments',
      'ticket_events',
      'releases',
      'triage_suggestions',
    ].map((table) => {
      const row =
        table === 'users'
          ? "to_jsonb(t) - 'account_status' - 'auth_version' - 'is_demo'"
          : 'to_jsonb(t)';
      const result = compose(
        false,
        [
          'exec',
          '-T',
          'postgres',
          'psql',
          '-U',
          'hardening',
          '-d',
          baseEnv.HARDENING_DATABASE,
          '-Atc',
          `SELECT count(*) || ':' || md5(coalesce(string_agg((${row})::text, '' ORDER BY id), '')) FROM ${table} t`,
        ],
        true,
      );
      return [table, result];
    }),
  );
}
const action = process.argv[2] ?? 'start';
if (action === 'stop') {
  compose(true, ['down']);
  compose(false, ['down']);
  process.exit(0);
}
if (action === 'snapshot') {
  console.log(JSON.stringify(snapshot(), null, 2));
  process.exit(0);
}
if (action !== 'start')
  throw new Error('Use start, stop or snapshot. No reset command is provided.');
mkdirSync('test-results/tls', { recursive: true });
if (!existsSync('test-results/tls/cert.pem')) {
  const openssl =
    process.env.OPENSSL_PATH ??
    (process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl');
  run(openssl, [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '7',
    '-keyout',
    'test-results/tls/key.pem',
    '-out',
    'test-results/tls/cert.pem',
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ]);
}
for (const app of ['api', 'web']) {
  const args = ['build', '-f', `apps/${app}/Dockerfile`, '-t', `clientops-hardening-${app}:local`];
  if (process.env.BUILD_CA_FILE)
    args.push('--secret', `id=build_ca,src=${resolve(process.env.BUILD_CA_FILE)}`);
  args.push('.');
  run('docker', args);
}
compose(false, ['up', '-d', '--wait', 'postgres', 'mailpit']);
const hasTables = compose(
  false,
  [
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'hardening',
    '-d',
    baseEnv.HARDENING_DATABASE,
    '-Atc',
    "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='tickets'",
  ],
  true,
);
if (hasTables === '0') {
  for (const command of ['migrate', 'seed'])
    run('docker', [
      'run',
      '--rm',
      '--network',
      'clientops-hardening_default',
      '-e',
      'NODE_ENV=development',
      '-e',
      `DATABASE_URL=postgresql://hardening:local_disposable_database_password@postgres:5432/${baseEnv.HARDENING_DATABASE}`,
      '-e',
      'DISPOSABLE_DATABASE_NAME=clientops_hardening_demo',
      '-e',
      'SEED_RESET=true',
      legacy,
      'node',
      `dist/${command}.js`,
    ]);
}
const before = snapshot();
compose(false, ['run', '--rm', '--no-deps', 'api', 'node', 'dist/migrate.js']);
const after = snapshot();
if (JSON.stringify(before) !== JSON.stringify(after))
  throw new Error('Upgrade changed existing business records.');
writeFileSync(
  'test-results/hardening-upgrade.json',
  JSON.stringify(
    {
      revision: run('git', ['rev-parse', 'HEAD'], baseEnv, true),
      workingTreeDirty: !!run('git', ['status', '--porcelain'], baseEnv, true),
      legacyImage: legacy,
      populatedFromLegacyThisRun: hasTables === '0',
      before,
      after,
      result: 'unchanged without reseeding',
    },
    null,
    2,
  ),
);
compose(false, ['up', '-d', '--no-build', '--wait']);
compose(false, ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'nginx']);
compose(true, ['up', '-d', '--wait', 'postgres', 'mailpit']);
compose(true, ['run', '--rm', '--no-deps', 'api', 'node', 'dist/migrate.js']);
const hasAdmin = compose(
  true,
  [
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'hardening',
    '-d',
    accountsEnv.HARDENING_DATABASE,
    '-Atc',
    "SELECT count(*) FROM users WHERE role='ADMIN'",
  ],
  true,
);
if (hasAdmin === '0')
  compose(true, [
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
compose(true, ['up', '-d', '--no-build', '--wait']);
compose(true, ['up', '-d', '--no-deps', '--force-recreate', '--wait', 'nginx']);
console.log(
  'HTTPS demo: https://localhost:8443; provisioned accounts: https://localhost:8444; capture mail: http://localhost:8025 and :8026.',
);
