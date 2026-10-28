import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const url = new URL(process.env.TEST_DATABASE_URL ?? '');
const database = decodeURIComponent(url.pathname.slice(1));
assert.ok(['postgres:', 'postgresql:'].includes(url.protocol));
assert.match(database, /^clientops_[a-z0-9_]*test$/);
assert.equal(process.env.DISPOSABLE_DATABASE_NAME, database);
const cwd = resolve('apps/api');
const env = {
  ...process.env,
  NODE_ENV: 'test',
  DATABASE_URL: url.href,
  MIGRATION_DATABASE_URL: url.href,
  SEED_RESET: 'false',
};
const entries = [
  'server',
  'migrate',
  'seed',
  'fingerprint',
  'bootstrap',
  'mail-worker',
  'restore-sanitize',
  'maintenance',
  'provision-roles',
  'check-runtime-role',
];
function run(args) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env,
    encoding: 'utf8',
    timeout: 20000,
    maxBuffer: 1024 * 1024,
  });
  if (result.error) throw result.error;
  return result;
}
for (const entry of entries) {
  assert.ok(existsSync(resolve(cwd, `dist/${entry}.js`)), `Missing ${entry} executable`);
  assert.equal(run(['--check', `dist/${entry}.js`]).status, 0, `${entry} syntax check failed`);
}
function fingerprint() {
  const result = run(['dist/fingerprint.js']);
  assert.equal(result.status, 0, 'Packaged fingerprint failed');
  return JSON.parse(result.stdout);
}
const before = fingerprint();
assert.equal(run(['dist/migrate.js']).status, 0, 'Packaged idempotent migration failed');
assert.deepEqual(fingerprint(), before, 'Packaged migration changed business records');
const seed = run(['dist/seed.js']);
assert.equal(seed.status, 1, 'Packaged seed must reject a missing reset acknowledgement');
assert.match(seed.stderr, /SEED_RESET/);
assert.deepEqual(fingerprint(), before, 'Rejected seed changed business records');
console.log(
  `All ${entries.length} packaged entry points parsed; migration/fingerprint and seed safety passed without resetting data.`,
);
