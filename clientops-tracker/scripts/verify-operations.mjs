import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import {
  compose,
  context,
  database,
  docker,
  keys,
  mailMessages,
  mailToken,
  mutation,
  project,
  published,
  query,
  waitFor,
} from './lib/ops-fixture.mjs';

const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const api = await context();
const member = await context();
const anonymous = await context();
const evidence = {
  revision,
  workingTreeDirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
  project,
  database,
  checkedAt: new Date().toISOString(),
  checks: {},
};
let paused = false;
let mailStopped = false;
let secondWorker;
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
  assert.equal((await api.get('/api/health/ready')).status(), 200);
  compose(['pause', 'postgres']);
  paused = true;
  const started = Date.now();
  assert.equal((await api.get('/api/health/ready')).status(), 503);
  const readinessMs = Date.now() - started;
  assert(readinessMs < 3000);
  assert.equal((await api.get('/api/health')).status(), 200);
  const authStart = Date.now();
  const unavailable = await api.get('/api/auth/me');
  assert.equal(unavailable.status(), 503);
  assert.equal((await unavailable.json()).error.code, 'SERVICE_UNAVAILABLE');
  const authenticatedMs = Date.now() - authStart;
  assert(authenticatedMs < 10000);
  compose(['unpause', 'postgres']);
  paused = false;
  await waitFor(
    async () => (await api.get('/api/health/ready')).status() === 200,
    'Readiness did not recover',
    30000,
  );
  assert.equal((await api.get('/api/auth/me')).status(), 200);
  evidence.checks.databaseOutage = {
    readinessMs,
    authenticatedMs,
    liveness: 200,
    outage: 503,
    recovery: 200,
  };

  compose(['stop', 'mailpit']);
  mailStopped = true;
  const email = `delivery-${Date.now()}@ops.example`;
  const invitation = await mutation(api, '/api/users/invitations', {
    name: 'Fictional Delivery Verification',
    email,
    role: 'DEVELOPER',
    clientId: null,
  });
  assert.equal(invitation.status(), 201);
  const userId = (await invitation.json()).data.id;
  assert.match(userId, /^[a-f0-9-]{36}$/);
  const jobId = query(
    `SELECT m.id FROM mail_outbox m JOIN account_tokens t ON t.id=m.token_id WHERE t.user_id='${userId}'`,
  );
  assert.match(jobId, /^[a-f0-9-]{36}$/);
  await waitFor(
    () =>
      Number(query(`SELECT attempts FROM mail_outbox WHERE id='${jobId}'`)) > 0 &&
      query(`SELECT status FROM mail_outbox WHERE id='${jobId}'`) === 'PENDING',
    'SMTP failure did not persist retry state',
    60000,
  );
  const tokenHash = query(
    `SELECT t.token_hash FROM account_tokens t JOIN mail_outbox m ON m.token_id=t.id WHERE m.id='${jobId}'`,
  );
  assert(!query(`SELECT payload FROM mail_outbox WHERE id='${jobId}'`).includes(email));
  compose(['restart', 'api']);
  await waitFor(
    async () => (await api.get('/api/health/ready')).status() === 200,
    'API/proxy did not recover after restart',
  );
  secondWorker = `${project}-mail-verifier-${Date.now()}`;
  compose(['run', '-d', '--no-deps', '--name', secondWorker, 'api', 'node', 'dist/mail-worker.js']);
  compose(['start', 'mailpit']);
  mailStopped = false;
  await waitFor(
    async () => (await api.get('/api/health/ready')).status() === 200,
    'Proxy did not recover during worker startup',
  );
  const invitationToken = await mailToken(email);
  await waitFor(
    () => query(`SELECT status FROM mail_outbox WHERE id='${jobId}'`) === 'DELIVERED',
    'SMTP acceptance not recorded',
  );
  assert.equal(
    query(
      `SELECT t.token_hash FROM account_tokens t JOIN mail_outbox m ON m.token_id=t.id WHERE m.id='${jobId}'`,
    ),
    tokenHash,
  );
  assert.equal((await mailMessages(email)).length, 1);
  assert.equal(query(`SELECT payload IS NULL FROM mail_outbox WHERE id='${jobId}'`), 't');
  assert.equal(
    (
      await mutation(anonymous, '/api/auth/accept-invitation', {
        token: invitationToken,
        password: 'Local-delivery-passphrase-42',
      })
    ).status(),
    200,
  );
  assert.equal(
    (
      await mutation(member, '/api/auth/login', { email, password: 'Local-delivery-passphrase-42' })
    ).status(),
    200,
  );
  await mutation(anonymous, '/api/auth/forgot-password', { email });
  const oldReset = await mailToken(email, true);
  await mutation(anonymous, '/api/auth/forgot-password', { email });
  const currentReset = await mailToken(email, true, oldReset);
  assert.equal(
    (
      await mutation(anonymous, '/api/auth/reset-password', {
        token: oldReset,
        password: 'Local-delivery-passphrase-43',
      })
    ).status(),
    400,
  );
  assert.equal(
    (
      await mutation(anonymous, '/api/auth/reset-password', {
        token: currentReset,
        password: 'Local-delivery-passphrase-43',
      })
    ).status(),
    200,
  );
  assert.equal((await member.get('/api/auth/me')).status(), 401);
  assert.equal(
    (
      await mutation(member, '/api/auth/login', { email, password: 'Local-delivery-passphrase-43' })
    ).status(),
    200,
  );
  const logs = compose(['logs', '--no-color', 'api']);
  for (const secret of [invitationToken, oldReset, currentReset, keys.session, keys.mail, email])
    assert(!logs.includes(secret), 'Sensitive account data appeared in application logs');
  evidence.checks.mail = {
    result: 'passed',
    smtpFailurePersisted: true,
    restartAndConcurrentWorker: true,
    sameTokenRetried: true,
    invitationMessages: 1,
    staleResetRejected: true,
    resetRevokedSession: true,
    logRedaction: true,
    fictionalAccount: email,
  };
  writeFileSync(
    published
      ? 'test-results/release-7eba339/operations-runtime.json'
      : 'test-results/operations-runtime.json',
    JSON.stringify(evidence, null, 2),
  );
  console.log(
    'Database outage/recovery, real SMTP outage/retry, restart, concurrent workers and stale-link checks passed.',
  );
} catch {
  console.error(
    'Outage/retry acceptance failed. Request headers and private configuration are intentionally omitted.',
  );
  process.exitCode = 1;
} finally {
  if (paused) compose(['unpause', 'postgres']);
  if (mailStopped) compose(['start', 'mailpit']);
  if (secondWorker) docker(['rm', '-f', secondWorker]);
  await api.dispose();
  await member.dispose();
  await anonymous.dispose();
}
