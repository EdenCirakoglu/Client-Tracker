import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createServer } from 'node:net';
import {
  compose,
  context,
  database,
  docker,
  environment,
  mailToken,
  mutation,
  project,
  query,
} from './lib/ops-fixture.mjs';

const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const stamp = Date.now();
const restoreProject = `${project}-restore-${stamp}`;
const restoreDatabase = `clientops_restore_${stamp}_demo`;
const privateDirectory = resolve('test-results/tls');
const api = await context();
const anonymous = await context();
const runtime = JSON.parse(readFileSync('test-results/operations-runtime.json', 'utf8'));
assert.equal(runtime.project, project);
const email = runtime.checks.mail.fictionalAccount;
assert.match(email, /^delivery-\d+@ops\.example$/);
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
const fingerprintSql = tables
  .map(
    (table) =>
      `SELECT '${table}', count(*), md5(coalesce(string_agg((to_jsonb(t)${table === 'users' ? " - 'auth_version'" : ''})::text, '' ORDER BY id), '')) FROM ${table} t`,
  )
  .join(';');
const currentApi = JSON.parse(docker(['image', 'inspect', environment.HARDENING_API_IMAGE]))[0].Id;
const currentWeb = JSON.parse(docker(['image', 'inspect', environment.HARDENING_WEB_IMAGE]))[0].Id;
const rollbackApi =
  'ghcr.io/edencirakoglu/client-tracker-api@sha256:c3e3c6e4e0d0166e54c734f29bd9270ba4fdaa8a4649ed052b1539a12da36e83';
const rollbackWeb =
  'ghcr.io/edencirakoglu/client-tracker-web@sha256:1d81853b12c29c73ac402160d6fff05d76a4fd71fbb84434730587a178059f79';
const server = createServer();
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
await new Promise((resolve) => server.close(resolve));
const restoredOrigin = `https://localhost:${port}`;
const config = JSON.parse(compose(['config', '--format', 'json']));
config.name = restoreProject;
config.networks.default.name = `${restoreProject}_default`;
config.volumes.postgres_data.name = `${restoreProject}_postgres_data`;
config.services.postgres.environment.POSTGRES_DB = restoreDatabase;
delete config.services.mailpit.ports;
delete config.services.api.build;
delete config.services.web.build;
config.services.api.image = currentApi;
config.services.web.image = currentWeb;
Object.assign(config.services.api.environment, {
  DATABASE_URL: `postgresql://hardening:local_disposable_database_password@postgres:5432/${restoreDatabase}`,
  DISPOSABLE_DATABASE_NAME: restoreDatabase,
  APP_ORIGIN: restoredOrigin,
});
config.services.nginx.ports[0].published = String(port);
const configPath = resolve(privateDirectory, `${restoreProject}.json`);
const saveConfig = () => writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
saveConfig();
const restored = (args, options = {}) =>
  docker(['compose', '-p', restoreProject, '-f', configPath, ...args], options);
const restoredQuery = (sql) =>
  restored([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'hardening',
    '-d',
    restoreDatabase,
    '-Atc',
    sql,
  ]);
let client;
let restoredAdmin;
let bluewave;
try {
  assert.equal(
    (
      await mutation(api, '/api/auth/login', {
        email: 'admin@example.com',
        password: 'password123',
      })
    ).status(),
    200,
  );
  const liveCookie = await api.storageState();
  const previousReset = await mailToken(email, true);
  await mutation(anonymous, '/api/auth/forgot-password', { email });
  const liveReset = await mailToken(email, true, previousReset);
  const liveResetHash = createHash('sha256').update(liveReset).digest('hex');
  assert.equal(
    query(
      `SELECT count(*) FROM account_tokens WHERE token_hash='${liveResetHash}' AND consumed_at IS NULL AND expires_at > now()`,
    ),
    '1',
  );
  const before = query(fingerprintSql);
  const dumpStarted = Date.now();
  const args = [
    'exec',
    '-T',
    'postgres',
    'pg_dump',
    '-U',
    'hardening',
    '-d',
    database,
    '--format=custom',
    '--no-owner',
    '--no-acl',
    ...['web_sessions', 'auth_sessions', 'account_tokens', 'mail_outbox', 'auth_rate_limits'].map(
      (t) => `--exclude-table-data=public.${t}`,
    ),
  ];
  const dump = execFileSync(
    'docker',
    [
      'compose',
      '-p',
      project,
      '--env-file',
      '.env.hardening.example',
      '-f',
      'docker-compose.hardening.yml',
      ...args,
    ],
    { env: environment, maxBuffer: 64 * 1024 * 1024, timeout: 120000 },
  );
  const dumpMs = Date.now() - dumpStarted;
  writeFileSync(resolve(privateDirectory, `${restoreProject}.dump`), dump, { mode: 0o600 });
  const restoreStarted = Date.now();
  restored(['up', '-d', '--wait', 'postgres', 'mailpit']);
  assert.equal(
    restoredQuery("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"),
    '0',
  );
  restored(
    [
      'exec',
      '-T',
      'postgres',
      'pg_restore',
      '-U',
      'hardening',
      '-d',
      restoreDatabase,
      '--no-owner',
      '--no-acl',
      '--exit-on-error',
    ],
    { input: dump },
  );
  assert.equal(restoredQuery(fingerprintSql), before);
  const sanitize = [
    'run',
    '--rm',
    '-T',
    '--no-deps',
    '-e',
    `RESTORE_CONFIRM_DATABASE=${restoreDatabase}`,
    '-e',
    'RESTORE_OFFLINE=true',
    'api',
    'node',
    'dist/restore-sanitize.js',
  ];
  assert.throws(
    () => restored(['run', '--rm', '-T', '--no-deps', 'api', 'node', 'dist/restore-sanitize.js']),
    'Sanitisation must require explicit confirmation',
  );
  restored(sanitize);
  assert.equal(restoredQuery(fingerprintSql), before);
  assert.equal(
    restoredQuery("SELECT count(*) FROM pg_constraint WHERE contype='f' AND NOT convalidated"),
    '0',
  );
  restored(['run', '--rm', '-T', '--no-deps', 'api', 'node', 'dist/migrate.js']);
  restored(['up', '-d', '--wait', '--no-build']);
  const recoveryMs = Date.now() - restoreStarted;
  const { request } = await import('@playwright/test');
  restoredAdmin = await request.newContext({
    baseURL: restoredOrigin,
    ignoreHTTPSErrors: true,
    storageState: liveCookie,
  });
  assert.equal((await restoredAdmin.get('/api/auth/me')).status(), 401);
  assert.equal(
    (
      await mutation(restoredAdmin, '/api/auth/reset-password', {
        token: liveReset,
        password: 'Local-delivery-passphrase-44',
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await mutation(restoredAdmin, '/api/auth/login', {
        email,
        password: 'Local-delivery-passphrase-43',
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await mutation(restoredAdmin, '/api/auth/login', {
        email: 'admin@example.com',
        password: 'password123',
      })
    ).status(),
    200,
  );
  assert.throws(() => restored(sanitize), 'A live database must not be sanitised');
  client = await context(restoredOrigin);
  bluewave = await context(restoredOrigin);
  assert.equal(
    (
      await mutation(client, '/api/auth/login', {
        email: 'client@example.com',
        password: 'password123',
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await mutation(bluewave, '/api/auth/login', {
        email: 'bluewave@example.com',
        password: 'password123',
      })
    ).status(),
    200,
  );
  const own = (await (await client.get('/api/projects')).json()).data;
  const foreign = (await (await bluewave.get('/api/projects')).json()).data;
  assert(own.length && foreign.length);
  assert.equal((await client.get(`/api/projects/${foreign[0].id}`)).status(), 404);
  const list = (await (await client.get('/api/tickets')).json()).data;
  const ticket = Array.isArray(list) ? list[0] : list.items[0];
  const comment = `Restore rehearsal ${stamp}`;
  assert.equal(
    (
      await mutation(client, `/api/tickets/${ticket.id}/comments`, {
        body: comment,
        isInternal: false,
      })
    ).status(),
    201,
  );
  const sourceStillLive = await api.get('/api/auth/me');
  assert.equal(sourceStillLive.status(), 200);
  assert.equal(query(fingerprintSql), before);

  // Roll back application images only. Keep the additive schema and stop all new workers.
  docker(['pull', rollbackApi]);
  docker(['pull', rollbackWeb]);
  const beforeRollback = restoredQuery(fingerprintSql);
  config.services.api.image = rollbackApi;
  config.services.web.image = rollbackWeb;
  config.services.api.healthcheck.test = [
    'CMD',
    'node',
    '-e',
    "fetch('http://127.0.0.1:8080/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
  ];
  saveConfig();
  restored(['up', '-d', '--wait', '--no-build']);
  assert.equal(
    (
      await mutation(restoredAdmin, '/api/auth/login', {
        email: 'admin@example.com',
        password: 'password123',
      })
    ).status(),
    200,
  );
  assert.equal(restoredQuery(fingerprintSql), beforeRollback);
  const comments = (await (await restoredAdmin.get(`/api/tickets/${ticket.id}/comments`)).json())
    .data;
  assert(comments.some((item) => item.body === comment));
  assert.equal((await client.get(`/api/projects/${foreign[0].id}`)).status(), 404);
  const evidence = {
    revision,
    workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
    checkedAt: new Date().toISOString(),
    sourceProject: project,
    restoreProject,
    restoreDatabase,
    dumpSha256: createHash('sha256').update(dump).digest('hex'),
    dumpMs,
    recoveryMs,
    businessTables: tables.length,
    recordsAndRelationshipsPreserved: true,
    sessionsAndLinksInvalidated: true,
    loginAndOrganisationBoundary: true,
    sourceUnchanged: true,
    currentApi,
    currentWeb,
    rollback: {
      revision: 'bdc749421187c017f4cc3ba36b2b9ef1d09fda80',
      api: rollbackApi,
      web: rollbackWeb,
      recordsAndCommentPreserved: true,
    },
    rpo: 'Snapshot at dump start; subsequent writes are outside this backup. No WAL/PITR configured.',
    limitations:
      'Local small-fixture recovery time, not a production SLA. Rollback loses durable email processing and readiness endpoints.',
  };
  writeFileSync('test-results/restore-runtime.json', JSON.stringify(evidence, null, 2));
  console.log(
    'Populated restore, offline safeguards, session/link invalidation, authorisation and pinned session-era rollback passed.',
  );
} finally {
  await api.dispose();
  await anonymous.dispose();
  await client?.dispose();
  await restoredAdmin?.dispose();
  await bluewave?.dispose();
  restored(['stop']);
}
