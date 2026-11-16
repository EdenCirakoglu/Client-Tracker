import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, unlinkSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validatePrivateStaging } from '../lib/private-staging.mjs';

const revision = 'a'.repeat(40);
const image = `ghcr.io/fictional/api@sha256:${'b'.repeat(64)}`;
const credentials = ['o', 'm', 'r', 'b'].map((letter) => letter.repeat(32));
const url = (role, index) =>
  `postgresql://${role}:${credentials[index]}@postgres/clientops_staging`;
const config = () => ({
  name: 'clientops-staging',
  'x-clientops-release': revision,
  services: {
    api: {
      image,
      environment: {
        DATABASE_URL: url('clientops_runtime', 2),
        NODE_ENV: 'production',
        DEPLOYMENT_MODE: 'production',
        DEMO_MODE: 'false',
        SMTP_MODE: 'smtp',
        TRUST_PROXY: '1',
        APP_ORIGIN: 'https://staging.fictional-agency.org:8443',
        SESSION_SECRET: 's'.repeat(40),
        MAIL_ENCRYPTION_KEY: 'c'.repeat(64),
      },
    },
    web: { image },
    migrate: { image, environment: { DATABASE_URL: url('clientops_migrator', 1) } },
    provision: {
      image,
      environment: {
        ADMIN_DATABASE_URL: url('owner', 0),
        MIGRATION_PASSWORD: credentials[1],
        RUNTIME_PASSWORD: credentials[2],
        BACKUP_PASSWORD: credentials[3],
      },
    },
    postgres: {
      environment: {
        POSTGRES_DB: 'clientops_staging',
        POSTGRES_USER: 'owner',
        POSTGRES_PASSWORD: credentials[0],
      },
      volumes: [{ type: 'volume', source: 'pg', target: '/var/lib/postgresql/data' }],
    },
    operations: {
      image: `sha256:${'d'.repeat(64)}`,
      environment: {
        PGDATABASE: 'clientops_staging',
        PGUSER: 'clientops_backup',
        PGHOST: 'postgres',
        PGPASSWORD: credentials[3],
        OPS_MODE: 'production',
        MONITOR_ORIGIN: 'https://staging.fictional-agency.org:8443',
        RESTIC_REPOSITORY:
          's3:https://fra1.digitaloceanspaces.com/fictional-backups/clientops-staging',
      },
      volumes: [{ type: 'volume', source: 'ops', target: '/state' }],
    },
    nginx: {
      ports: [80, 443].map((port) => ({
        host_ip: '127.0.0.1',
        published: String(port),
        target: port,
        protocol: 'tcp',
      })),
    },
  },
  volumes: { pg: { name: 'clientops-staging_pg' }, ops: { name: 'clientops-staging_ops' } },
});
const options = { revision, mode: 'install' };

test('CLI succeeds read-only and rejects invalid private JSON without logging its content', () => {
  const directory = mkdtempSync(join(tmpdir(), 'clientops-preflight-'));
  const file = join(directory, 'config.json');
  const cli = fileURLToPath(new URL('../staging-preflight.mjs', import.meta.url));
  const run = () =>
    spawnSync(
      process.execPath,
      [cli, `--config=${file}`, `--revision=${revision}`, '--mode=install'],
      { encoding: 'utf8' },
    );
  try {
    writeFileSync(file, JSON.stringify(config()));
    const success = run();
    assert.equal(success.status, 0, success.stderr);
    assert.equal(JSON.parse(success.stdout).revision, revision);
    writeFileSync(file, '{"private-value-that-must-not-appear"');
    const failure = run();
    assert.equal(failure.status, 1);
    assert(!`${failure.stdout}${failure.stderr}`.includes('private-value-that-must-not-appear'));
    assert.match(failure.stderr, /Cannot read private rendered configuration/);
  } finally {
    unlinkSync(file);
    rmdirSync(directory);
  }
});

test('private staging configuration is checked without mutation or leaking values', () => {
  const value = config();
  const before = structuredClone(value);
  const result = validatePrivateStaging(value, options);
  assert.match(result.result, /no deployment/);
  assert.equal(result.pending.length, 3);
  assert.deepEqual(value, before);
  for (const credential of credentials) assert(!JSON.stringify(result).includes(credential));
  validatePrivateStaging(value, { ...options, mode: 'update' });
});

for (const [name, mutate] of [
  [
    'public gateway',
    (value) => {
      value.services.nginx.ports[0].host_ip = '0.0.0.0';
    },
  ],
  [
    'private API exposed',
    (value) => {
      value.services.api.ports = ['8080:8080'];
    },
  ],
  [
    'operator port exposed',
    (value) => {
      value.services.operations.ports = ['9999:9999'];
    },
  ],
  [
    'host networking',
    (value) => {
      value.services.web.network_mode = 'host';
    },
  ],
  [
    'local rebuild',
    (value) => {
      value.services.web.build = '.';
    },
  ],
  [
    'shared volume',
    (value) => {
      value.volumes.pg.name = 'clientops-production_pg';
    },
  ],
  [
    'external volume',
    (value) => {
      value.volumes.ops.external = true;
    },
  ],
  [
    'demo mode',
    (value) => {
      value.services.api.environment.DEMO_MODE = 'true';
    },
  ],
  [
    'non-production cookies',
    (value) => {
      value.services.api.environment.NODE_ENV = 'development';
    },
  ],
  [
    'unbounded proxy trust',
    (value) => {
      value.services.api.environment.TRUST_PROXY = 'true';
    },
  ],
  [
    'capture SMTP',
    (value) => {
      value.services.api.environment.SMTP_MODE = 'capture';
    },
  ],
  [
    'shared database',
    (value) => {
      value.services.postgres.environment.POSTGRES_DB = 'clientops';
    },
  ],
  [
    'moving image',
    (value) => {
      value.services.web.image = 'web:latest';
    },
  ],
  [
    'moving operator image',
    (value) => {
      value.services.operations.image = 'ops:latest';
    },
  ],
  [
    'local backup',
    (value) => {
      value.services.operations.environment.RESTIC_REPOSITORY = '/backups';
    },
  ],
  [
    'placeholder origin',
    (value) => {
      value.services.api.environment.APP_ORIGIN = 'https://staging.example.com:8443';
    },
  ],
  [
    'credential reuse',
    (value) => {
      value.services.api.environment.SESSION_SECRET = credentials[0];
    },
  ],
  [
    'placeholder secret',
    (value) => {
      value.services.api.environment.SESSION_SECRET =
        'replace-this-placeholder-before-installation';
    },
  ],
  [
    'mismatched provisioning password',
    (value) => {
      value.services.provision.environment.RUNTIME_PASSWORD = 'z'.repeat(32);
    },
  ],
]) {
  test(`private staging rejects ${name}`, () => {
    const value = config();
    mutate(value);
    assert.throws(() => validatePrivateStaging(value, options));
  });
}

test('malformed URL and foreign revision fail without reflecting credentials', () => {
  const value = config();
  value.services.api.environment.DATABASE_URL = 'private-value-not-a-url';
  assert.throws(
    () => validatePrivateStaging(value, options),
    (error) => !error.message.includes('private-value'),
  );
  assert.throws(() => validatePrivateStaging(config(), { ...options, revision: 'e'.repeat(40) }));
});
