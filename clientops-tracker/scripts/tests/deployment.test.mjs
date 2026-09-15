import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  deploymentLock,
  executeDeployment,
  validateDeployment,
  validateDatabaseContinuity,
} from '../lib/deployment.mjs';

test('update drains writers and verifies backup before migration; never provisions', async () => {
  const steps = [];
  await executeDeployment('update', async (step) => steps.push(step));
  assert.deepEqual(steps, [
    'preflight',
    'repository-check',
    'database-check',
    'pause-writers',
    'quiescence-check',
    'backup',
    'backup-check',
    'migrate',
    'runtime-role-check',
    'start-app',
    'start-gateway',
    'readiness',
    'record-success',
  ]);
});
test('conversion backs up before explicit provisioning; install requires no preexisting data', async () => {
  const conversion = [];
  await executeDeployment('convert', async (step) => conversion.push(step));
  assert(conversion.indexOf('backup-check') < conversion.indexOf('provision'));
  assert(conversion.indexOf('provision') < conversion.indexOf('migrate'));
  const install = [];
  await executeDeployment('install', async (step) => install.push(step));
  assert(!install.includes('backup'));
  assert(install.includes('database-check') && install.includes('provision'));
});
for (const failure of ['backup', 'provision', 'migrate', 'start-app', 'readiness']) {
  test(`${failure} failure leaves maintenance blocked and never automatically rolls back`, async () => {
    const steps = [];
    await assert.rejects(
      executeDeployment('convert', async (step) => {
        steps.push(step);
        if (step === failure) throw new Error('Fixture failure');
      }),
      /No automatic rollback/,
    );
    assert.deepEqual(steps.slice(-2), ['stop-after-failure', 'notify-failure']);
    assert(!steps.includes('record-success'));
  });
}
test('preflight failure does not stop an existing service', async () => {
  const steps = [];
  await assert.rejects(
    executeDeployment('update', async (step) => {
      steps.push(step);
      throw new Error('missing configuration');
    }),
  );
  assert.deepEqual(steps, ['preflight']);
});
test('deployment and maintenance lock refuses concurrent acquisition', () => {
  const dir = mkdtempSync(join(tmpdir(), 'clientops-lock-'));
  const unlock = deploymentLock(dir);
  assert.throws(() => deploymentLock(dir), /lock exists/);
  unlock();
  deploymentLock(dir)();
  rmdirSync(dir);
});
const revision = 'a'.repeat(40);
const image = `ghcr.io/example/api@sha256:${'b'.repeat(64)}`;
const config = () => ({
  name: 'clientops-staging',
  'x-clientops-release': revision,
  services: {
    api: {
      image,
      environment: {
        DATABASE_URL: 'postgresql://clientops_runtime:fixture@postgres/clientops',
        DEPLOYMENT_MODE: 'production',
        DEMO_MODE: 'false',
        SMTP_MODE: 'smtp',
      },
    },
    migrate: {
      image,
      environment: { DATABASE_URL: 'postgresql://clientops_migrator:fixture@postgres/clientops' },
    },
    provision: {
      image,
      environment: { ADMIN_DATABASE_URL: 'postgresql://owner:fixture@postgres/clientops' },
    },
    postgres: { environment: { POSTGRES_DB: 'clientops', POSTGRES_USER: 'owner' } },
    operations: {
      environment: {
        PGDATABASE: 'clientops',
        PGUSER: 'clientops_backup',
        PGHOST: 'postgres',
        OPS_MODE: 'production',
      },
    },
    web: { image },
    nginx: {},
  },
});
const options = { project: 'clientops-staging', revision, mode: 'update' };
test('application updates cannot change database identity, storage or PostgreSQL version', () => {
  const previous = config();
  previous.services.postgres.image = 'postgres:16-alpine';
  previous.services.postgres.volumes = [
    { type: 'volume', source: 'data', target: '/var/lib/postgresql/data' },
  ];
  previous.volumes = { data: { name: 'clientops_data' } };
  validateDatabaseContinuity(previous, structuredClone(previous));
  for (const change of [
    (next) => {
      next.services.postgres.image = 'postgres:17-alpine';
    },
    (next) => {
      next.services.postgres.environment.POSTGRES_DB = 'another';
    },
    (next) => {
      next.volumes.data.name = 'another';
    },
  ]) {
    const next = structuredClone(previous);
    change(next);
    assert.throws(() => validateDatabaseContinuity(previous, next), /Database identity/);
  }
});
test('production validates pinned images, role boundaries and explicit conversion', () => {
  validateDeployment(config(), options);
  assert.throws(
    () => validateDeployment(config(), { ...options, mode: 'convert' }),
    /allow-provision/,
  );
  validateDeployment(config(), { ...options, mode: 'convert', provision: 'clientops' });
  assert.throws(
    () => validateDeployment(config(), { ...options, fixture: true }),
    /Fixture bypass/,
  );
  const elevated = config();
  elevated.services.api.environment.DATABASE_URL = 'postgresql://owner:fixture@postgres/clientops';
  assert.throws(() => validateDeployment(elevated, options), /separate runtime/);
  const exposed = config();
  exposed.services.api.ports = ['8080:8080'];
  assert.throws(() => validateDeployment(exposed, options), /host ports/);
  const moving = config();
  moving.services.web.image = 'web:latest';
  assert.throws(() => validateDeployment(moving, options), /registry digests/);
  const foreign = config();
  foreign.services.provision.environment.ADMIN_DATABASE_URL =
    'postgresql://owner:fixture@another/clientops';
  assert.throws(
    () => validateDeployment(foreign, { ...options, mode: 'convert', provision: 'clientops' }),
    /Compose database/,
  );
});
