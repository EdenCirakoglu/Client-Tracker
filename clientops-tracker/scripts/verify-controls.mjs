import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { compose, project, query } from './lib/ops-fixture.mjs';
import { ops, job, backupDump } from './lib/backup-fixture.mjs';

const build = ['build', '-f', 'ops/Dockerfile', '-t', 'clientops-operations:local'];
if (process.env.BUILD_CA_FILE)
  build.push('--secret', `id=build_ca,src=${resolve(process.env.BUILD_CA_FILE)}`);
execFileSync('docker', [...build, '.'], { stdio: 'inherit' });
ops(['up', '-d', '--no-deps', 'alerts']);
const shell = (script) =>
  ops(['run', '--rm', '--no-deps', '--entrypoint', 'sh', 'operations', '-c', script]);
try {
  shell('test -f /repository/config');
} catch {
  job('init');
}
const started = Date.now();
const dump = backupDump();
assert(dump.subarray(0, 5).equals(Buffer.from('PGDMP')));
job('check');
job('prune');
assert.throws(
  () =>
    ops([
      'run',
      '--rm',
      '--no-deps',
      '-e',
      'RESTIC_PASSWORD=wrong-fixture-passphrase',
      '--entrypoint',
      'restic',
      'operations',
      'snapshots',
    ]),
  'Wrong encryption password must fail',
);
compose(['exec', '-T', 'api', 'node', 'dist/maintenance.js']);
shell('date +%s > /state/maintenance.ok');
job('monitor');
assert.throws(
  () => job('backup', ['-e', 'PGHOST=unavailable.invalid']),
  'Database backup failure must not be marked successful',
);
shell('test -f /state/backup.failed');
assert.throws(() => job('monitor'), 'Persisted backup failure must be detected');
job('backup');
job('monitor');
shell('echo 1 > /state/backup.ok');
assert.throws(() => job('monitor'), 'Stale backup must be detected');
job('backup');
assert.throws(
  () => job('monitor', ['-e', 'CERT_MIN_SECONDS=31536000']),
  'Upcoming certificate expiry must be detected',
);
const mailId = randomUUID();
let paused = false;
try {
  query(
    `INSERT INTO mail_outbox(id,kind,status,expires_at,created_at) VALUES ('${mailId}', 'RECOVERY_REQUEST','FAILED',now()+interval '1 hour',now()-interval '20 minutes')`,
  );
  assert.throws(() => job('monitor'), 'Failed delivery must be visible');
  query(`DELETE FROM mail_outbox WHERE id='${mailId}'`);
  compose(['pause', 'postgres']);
  paused = true;
  assert.throws(() => job('monitor'), 'Readiness failure must alert');
  compose(['unpause', 'postgres']);
  paused = false;
  job('monitor');
  const count = JSON.parse(
    ops([
      'exec',
      '-T',
      'alerts',
      'node',
      '-e',
      "fetch('http://127.0.0.1:8099/count').then(r=>r.text()).then(console.log)",
    ]),
  ).alerts;
  assert(count >= 6);
  writeFileSync(
    'test-results/operator-controls.json',
    JSON.stringify(
      {
        revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
        project,
        checkedAt: new Date().toISOString(),
        elapsedMs: Date.now() - started,
        encryptedBackupAndReadback: true,
        wrongPasswordRejected: true,
        readOnlyBackupRole: true,
        readinessFailure: true,
        expiredCertificateWarning: true,
        emailFailure: true,
        staleBackup: true,
        failedBackup: true,
        recovery: true,
        localWebhookMessages: count,
        externalS3: 'Not configured or tested',
        externalAlerts: 'Not configured or tested',
      },
      null,
      2,
    ),
  );
  console.log(
    'Encrypted backup/readback, retention, readiness/mail/backup/certificate failure detection and local alert capture passed.',
  );
} finally {
  if (paused) compose(['unpause', 'postgres']);
  query(`DELETE FROM mail_outbox WHERE id='${mailId}'`);
  ops(['stop', 'alerts']);
}
