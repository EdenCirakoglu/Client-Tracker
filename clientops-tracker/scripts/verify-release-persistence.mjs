import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { request } from '@playwright/test';

const operationsRelease = process.argv.includes('--release=7eba339');
const baseURL = `https://localhost:${operationsRelease ? 8454 : 8450}`;
const sessions = [];
async function login(email) {
  const api = await request.newContext({ baseURL, ignoreHTTPSErrors: true });
  sessions.push(api);
  const csrf = (await (await api.get('/api/auth/csrf')).json()).data.csrfToken;
  assert.equal(
    (
      await api.post('/api/auth/login', {
        headers: { 'X-CSRF-Token': csrf },
        data: { email, password: 'password123' },
      })
    ).status(),
    200,
  );
  return api;
}
try {
  const admin = await login('admin@example.com');
  const northstar = await login('client@example.com');
  const bluewave = await login('bluewave@example.com');
  const a = (await (await northstar.get('/api/projects')).json()).data;
  const b = (await (await bluewave.get('/api/projects')).json()).data;
  assert(a.length && b.length);
  assert(!a.some((x) => b.some((y) => y.id === x.id)));
  assert([403, 404].includes((await northstar.get(`/api/projects/${b[0].id}`)).status()));
  assert([403, 404].includes((await bluewave.get(`/api/projects/${a[0].id}`)).status()));
  const ticket = (await (await northstar.get('/api/tickets')).json()).data[0];
  assert(ticket);
  assert([403, 404].includes((await bluewave.get(`/api/tickets/${ticket.id}`)).status()));
  const comments = (await (await northstar.get(`/api/tickets/${ticket.id}/comments`)).json()).data;
  assert(comments.every((item) => !item.isInternal));
  const metrics = (await (await northstar.get('/api/dashboard/metrics')).json()).data;
  assert(!metrics.developerWorkload?.length);
  const before = await (await admin.get(`/api/tickets/${ticket.id}`)).json();
  execFileSync(
    process.execPath,
    [
      'scripts/verify-published.mjs',
      'persistence',
      ...(operationsRelease ? ['--release=7eba339'] : []),
    ],
    {
      stdio: 'inherit',
    },
  );
  assert.equal((await admin.get('/api/auth/me')).status(), 200);
  assert.deepEqual(await (await admin.get(`/api/tickets/${ticket.id}`)).json(), before);
  const state = await admin.storageState();
  const replay = await request.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
    storageState: state,
  });
  sessions.push(replay);
  const csrf = (await (await admin.get('/api/auth/csrf')).json()).data.csrfToken;
  assert.equal(
    (await admin.post('/api/auth/logout', { headers: { 'X-CSRF-Token': csrf } })).status(),
    200,
  );
  assert.equal((await replay.get('/api/auth/me')).status(), 401);
  writeFileSync(
    `test-results/release-${operationsRelease ? '7eba339' : 'bdc749'}/acceptance.json`,
    JSON.stringify(
      {
        revision: operationsRelease
          ? '7eba339b37a2aa948ef4f6ed019d268816d4ec99'
          : 'bdc749421187c017f4cc3ba36b2b9ef1d09fda80',
        checkedAt: new Date().toISOString(),
        result: 'passed',
        checks: [
          'two-organisation project/ticket isolation',
          'public comments only',
          'no client developer workload',
          'eight-table fingerprints survive full container recreation',
          'existing session and ticket survive recreation',
          'server rejects logged-out cookie replay',
        ],
      },
      null,
      2,
    ),
  );
  console.log('Published-image persistence, organisation boundaries and logout replay: passed.');
} finally {
  for (const api of sessions) await api.dispose();
}
