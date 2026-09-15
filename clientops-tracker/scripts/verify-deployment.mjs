import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'node:fs';
import { resolve } from 'node:path';
import { verifyCertificateHook } from './lib/certificate-fixture.mjs';
import { compose, query, docker, environment, context, mutation } from './lib/ops-fixture.mjs';

const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const targetRevision = process.argv
  .find((arg) => arg.startsWith('--target-revision='))
  ?.split('=')[1];
if (targetRevision) {
  assert.equal(targetRevision, revision, 'Use a checkout of the exact published target revision');
  assert.match(targetRevision, /^[a-f0-9]{40}$/);
  assert(
    process.argv.includes('--published=7eba339'),
    'Use the preserved published baseline as the data source',
  );
  assert.equal(
    execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
    '',
    'Published verification requires a clean checkout',
  );
}
const stamp = Date.now();
const project = `clientops-deploy-${stamp}`;
const database = `clientops_deploy_${stamp}_demo`;
const directory = resolve(`test-results/tls/${project}`);
const state = `${directory}/state`;
mkdirSync(directory, { recursive: true, mode: 0o700 });
const save = (file, value) => writeFileSync(file, JSON.stringify(value), { mode: 0o600 });
const config = JSON.parse(compose(['config', '--format', 'json']));
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
const fingerprint = tables
  .map(
    (table) =>
      `SELECT '${table}', count(*), md5(coalesce(string_agg(to_jsonb(t)::text, '' ORDER BY id), '')) FROM ${table} t`,
  )
  .join(';');
const before = query(fingerprint);
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const origin = `https://localhost:${port}`;
const keys = Object.fromEntries(
  ['runtime', 'migrator', 'backup', 'restic'].map((key) => [key, randomBytes(32).toString('hex')]),
);
function targetImage(service) {
  if (!targetRevision)
    return JSON.parse(
      docker(['image', 'inspect', environment[`HARDENING_${service.toUpperCase()}_IMAGE`]]),
    )[0].Id;
  const repository = `ghcr.io/${process.env.GHCR_OWNER ?? 'edencirakoglu'}/${process.env.GHCR_REPOSITORY ?? 'client-tracker'}-${service}`;
  docker(['pull', `${repository}:${targetRevision}`]);
  const image = JSON.parse(docker(['image', 'inspect', `${repository}:${targetRevision}`]))[0];
  assert.equal(image.Config.Labels['org.opencontainers.image.revision'], targetRevision);
  const digest = image.RepoDigests.find((ref) => ref.startsWith(`${repository}@sha256:`));
  assert(digest);
  console.log(`Published ${service}: ${digest}`);
  return digest;
}
const apiImage = targetImage('api');
const webImage = targetImage('web');
const publishedApi =
  'ghcr.io/edencirakoglu/client-tracker-api@sha256:f89b550bd3c3166ee4be56a9a8d6a64950f53b7482edc65394a313ca66e512df';
const publishedWeb =
  'ghcr.io/edencirakoglu/client-tracker-web@sha256:780012866bcf3ac9a3155290ff3d3ad7ab14019c7b22d851629f90eddaf2cb39';
const build = [
  'build',
  '-f',
  'ops/Dockerfile',
  '--build-arg',
  `SOURCE_REVISION=${revision}`,
  '-t',
  `clientops-operations:${revision}`,
];
if (process.env.BUILD_CA_FILE)
  build.push('--secret', `id=build_ca,src=${resolve(process.env.BUILD_CA_FILE)}`);
execFileSync('docker', [...build, '.'], { stdio: 'inherit' });
const operatorImage = JSON.parse(
  docker(['image', 'inspect', `clientops-operations:${revision}`]),
)[0].Id;
config.name = project;
config['x-clientops-release'] = revision;
config.networks.default.name = `${project}_default`;
config.volumes = Object.fromEntries(
  ['postgres_data', 'operations_state', 'backup_secrets', 'repository'].map((name) => [
    name,
    { name: `${project}_${name}` },
  ]),
);
config.services.postgres.environment.POSTGRES_DB = database;
delete config.services.mailpit.ports;
Object.assign(config.services.api.environment, {
  DATABASE_URL: `postgresql://clientops_runtime:${keys.runtime}@postgres:5432/${database}`,
  DISPOSABLE_DATABASE_NAME: database,
  APP_ORIGIN: origin,
});
config.services.api.image = apiImage;
config.services.web.image = webImage;
config.services.nginx.ports[0].published = String(port);
for (const service of Object.values(config.services)) delete service.build;
config.services.migrate = {
  image: apiImage,
  command: ['node', 'dist/migrate.js'],
  profiles: ['operator'],
  environment: {
    DATABASE_URL: `postgresql://clientops_migrator:${keys.migrator}@postgres:5432/${database}`,
  },
};
config.services.provision = {
  image: apiImage,
  command: ['node', 'dist/provision-roles.js'],
  profiles: ['operator'],
  environment: {
    ADMIN_DATABASE_URL: `postgresql://hardening:local_disposable_database_password@postgres:5432/${database}`,
    DATABASE_ADMIN_CONFIRM: database,
    MIGRATION_PASSWORD: keys.migrator,
    RUNTIME_PASSWORD: keys.runtime,
    BACKUP_PASSWORD: keys.backup,
  },
};
writeFileSync(`${directory}/restic-password`, keys.restic, { mode: 0o600 });
writeFileSync(`${directory}/alert-curl.conf`, 'url = "http://alerts:8099/alerts"\n', {
  mode: 0o600,
});
config.services['prepare-backup'] = {
  image: config.services.postgres.image,
  profiles: ['operator'],
  network_mode: 'none',
  read_only: true,
  entrypoint: ['sh', '-eu', '-c'],
  command: [
    'cp /input/restic-password /secrets/restic-password; cp /input/alert-curl.conf /secrets/alert-curl.conf; chown 0:0 /secrets /secrets/*; chmod 700 /secrets; chmod 600 /secrets/*',
  ],
  volumes: [`${directory}:/input:ro`, 'backup_secrets:/secrets'],
};
config.services.operations = {
  image: operatorImage,
  profiles: ['operator'],
  read_only: true,
  tmpfs: ['/tmp'],
  cap_drop: ['ALL'],
  security_opt: ['no-new-privileges:true'],
  environment: {
    OPS_MODE: 'disposable',
    PGHOST: 'postgres',
    PGDATABASE: database,
    PGUSER: 'clientops_backup',
    PGPASSWORD: keys.backup,
    RESTIC_REPOSITORY: '/repository',
    CERT_MIN_SECONDS: '86400',
  },
  volumes: [
    'operations_state:/state',
    'repository:/repository',
    'backup_secrets:/run/secrets:ro',
    `${config.services.nginx.volumes.find((volume) => volume.target === '/etc/nginx/tls').source}:/certs:ro`,
  ],
};
config.services.alerts = {
  image: apiImage,
  command: ['node', '/fixture/alert-server.mjs'],
  volumes: [`${resolve('scripts/fixtures/alert-server.mjs')}:/fixture/alert-server.mjs:ro`],
};
const path = `${directory}/compose.json`;
save(path, config);
const dc = (args, options = {}) => docker(['compose', '-p', project, '-f', path, ...args], options);
const sql = (text) =>
  dc([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-XAt',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'hardening',
    '-d',
    database,
    '-c',
    text,
  ]);
const invoke = (mode, extra = []) => {
  console.log(
    `Rehearsing deployment mode: ${mode}${extra.includes('--resume-after-review=true') ? ' (reviewed recovery)' : ''}`,
  );
  const output = execFileSync(
    process.execPath,
    [
      'scripts/deploy.mjs',
      'apply',
      `--config=${path}`,
      `--project=${project}`,
      `--revision=${revision}`,
      `--state-dir=${state}`,
      `--mode=${mode}`,
      '--fixture=true',
      ...extra,
    ],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 900000 },
  );
  console.log(`${mode}: completed all deployment phases.`);
  return output;
};
const runningWriters = () =>
  dc(['ps', '--status', 'running', '--services'])
    .split('\n')
    .filter((name) => ['api', 'nginx', 'web'].includes(name));
let admin;
let client;
let bluewave;
const results = {
  revision,
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  project,
  origin,
  testedAt: new Date().toISOString(),
  publishedTargetRevision: targetRevision ?? null,
  applicationImagesRebuilt: false,
};
try {
  dc(['up', '-d', '--wait', 'postgres', 'mailpit', 'alerts']);
  dc(['run', '--rm', '--no-deps', 'prepare-backup']);
  dc(['run', '--rm', '--no-deps', 'operations', 'init']);
  assert.equal(
    sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"),
    '0',
  );
  // Exercise first installation with the same CLI. No demo seed or real email is involved.
  invoke('install', [`--allow-provision=${database}`]);
  assert.equal(sql('SELECT count(*) FROM users'), '0');
  assert(!existsSync(`${state}/blocked.json`));
  results.firstInstall = true;
  dc(['stop', 'nginx', 'web', 'api']);

  // Populate only this new fixture from a source snapshot, never restore over the source.
  const dump = compose([
    'exec',
    '-T',
    'postgres',
    'pg_dump',
    '-U',
    'hardening',
    '-d',
    environment.HARDENING_DATABASE,
    '--data-only',
    '--no-owner',
    '--no-acl',
    ...tables.map((table) => `--table=public.${table}`),
  ]);
  dc(
    ['exec', '-T', 'postgres', 'psql', '-v', 'ON_ERROR_STOP=1', '-U', 'hardening', '-d', database],
    { input: dump },
  );
  assert.equal(sql(fingerprint), before);
  // Simulate the pre-conversion owner-based published deployment on the populated fixture.
  docker(['pull', publishedApi]);
  docker(['pull', publishedWeb]);
  const legacy = structuredClone(config);
  legacy.services.api.image = publishedApi;
  legacy.services.web.image = publishedWeb;
  legacy.services.api.environment.DATABASE_URL =
    config.services.provision.environment.ADMIN_DATABASE_URL;
  save(`${directory}/legacy.json`, legacy);
  docker([
    'compose',
    '-p',
    project,
    '-f',
    `${directory}/legacy.json`,
    'up',
    '-d',
    '--no-build',
    '--wait',
    'api',
    'web',
    'nginx',
  ]);
  // Remove only this disposable cluster's newly created roles to reproduce an owner-only release.
  sql(
    'REASSIGN OWNED BY clientops_migrator TO hardening; DROP OWNED BY clientops_runtime; DROP OWNED BY clientops_backup; DROP OWNED BY clientops_migrator; DROP ROLE clientops_runtime; DROP ROLE clientops_backup; DROP ROLE clientops_migrator',
  );
  // Routine update must refuse an unconverted cluster even if URLs look correct.
  assert.throws(() => invoke('update'), /failed/);
  assert(runningWriters().includes('api'));
  assert.throws(() => invoke('convert'), /allow-provision/);
  invoke('convert', [`--allow-provision=${database}`]);
  assert.equal(sql(fingerprint), before);
  assert(!existsSync(`${state}/blocked.json`));
  results.published7ebaConversion = true;

  // Append a genuinely failing SQL migration to a private mount, not repository migrations.
  const migrations = `${directory}/failed-migrations`;
  cpSync('apps/api/drizzle', migrations, { recursive: true });
  const journal = JSON.parse(readFileSync(`${migrations}/meta/_journal.json`, 'utf8'));
  journal.entries.push({
    idx: journal.entries.length,
    version: '7',
    when: Date.now(),
    tag: '9999_failure_fixture',
    breakpoints: true,
  });
  save(`${migrations}/meta/_journal.json`, journal);
  writeFileSync(`${migrations}/9999_failure_fixture.sql`, 'SELECT 1 / 0;\n', { mode: 0o600 });
  config.services.migrate.volumes = [`${migrations}:/app/drizzle:ro`];
  save(path, config);
  assert.throws(() => invoke('update'), /failed at migrate/);
  assert.deepEqual(runningWriters(), []);
  assert(existsSync(`${state}/blocked.json`));
  assert.equal(sql(fingerprint), before);
  assert.throws(() => invoke('update'), /previous deployment is blocked/);
  delete config.services.migrate.volumes;
  save(path, config);
  invoke('update', ['--resume-after-review=true']);
  results.migrationFailureClosedAndRecovered = true;

  const sessionSecret = config.services.api.environment.SESSION_SECRET;
  config.services.api.environment.SESSION_SECRET = 'invalid-fixture';
  config.services.api.restart = 'no';
  save(path, config);
  assert.throws(() => invoke('update'), /failed at start-app/);
  assert.deepEqual(runningWriters(), []);
  assert(existsSync(`${state}/blocked.json`));
  config.services.api.environment.SESSION_SECRET = sessionSecret;
  save(path, config);
  invoke('update', ['--resume-after-review=true']);
  assert.equal(sql(fingerprint), before);
  results.startupFailureClosedAndRecovered = true;
  invoke('update');
  results.laterUpdate = true;

  admin = await context(origin);
  client = await context(origin);
  bluewave = await context(origin);
  for (const [api, email] of [
    [admin, 'admin@example.com'],
    [client, 'client@example.com'],
    [bluewave, 'bluewave@example.com'],
  ])
    assert.equal(
      (await mutation(api, '/api/auth/login', { email, password: 'password123' })).status(),
      200,
    );
  const foreign = (await (await bluewave.get('/api/projects')).json()).data[0];
  assert.equal((await client.get(`/api/projects/${foreign.id}`)).status(), 404);
  const tickets = (await (await admin.get('/api/tickets/queue')).json()).data;
  const ticket = tickets.items[0];
  assert.equal(
    (
      await mutation(admin, `/api/tickets/${ticket.id}/comments`, {
        body: 'Release candidate deployment rehearsal completed.',
        isInternal: true,
      })
    ).status(),
    201,
  );
  assert.equal(query(fingerprint), before);
  results.loginCommentsAndTenantBoundary = true;
  results.sourcePreserved = true;
  results.runtimeRoleRestricted =
    sql(
      "SELECT NOT rolsuper AND NOT rolcreatedb AND NOT rolcreaterole FROM pg_roles WHERE rolname='clientops_runtime'",
    ) === 't';
  assert(results.runtimeRoleRestricted);
  console.log('Rehearsing private-CA certificate renewal and failure recovery.');
  results.certificateHook = await verifyCertificateHook({
    config,
    state,
    directory,
    dc,
    origin,
    saveConfig: () => save(path, config),
  });
  const alerts = JSON.parse(
    dc([
      'exec',
      '-T',
      'alerts',
      'node',
      '-e',
      "fetch('http://127.0.0.1:8099/count').then(r=>r.text()).then(console.log)",
    ]),
  ).alerts;
  assert(
    alerts >= 4,
    'Migration, startup and two certificate failures must reach local alert capture',
  );
  results.capturedFailureAlerts = alerts;
  save('test-results/deployment-runtime.json', results);
  console.log(
    'First install, published-role conversion, verified backup, SQL/startup failure recovery and later update passed; source preserved.',
  );
} catch (error) {
  console.error('Deployment rehearsal failed; private configuration and container output omitted.');
  const location = error.stack?.match(
    /(?:certificate-fixture|verify-deployment)\.mjs:(\d+):\d+/,
  )?.[1];
  if (location) console.error(`Verification script line: ${location}`);
  save('test-results/deployment-failure.json', {
    ...results,
    outcome: 'failed',
    verificationLine: location ?? null,
  });
  const phases = String(error.stdout ?? '')
    .split('\n')
    .filter((line) => line.startsWith('Deployment:'));
  if (phases.length) console.error(phases.at(-1));
  console.error(
    error instanceof assert.AssertionError
      ? error.message.slice(0, 300)
      : 'Inspect the last deployment phase in the private fixture.',
  );
  process.exitCode = 1;
} finally {
  await admin?.dispose();
  await client?.dispose();
  await bluewave?.dispose();
  dc(['stop']);
}
