import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planRollback } from '../lib/rollback-plan.mjs';
const config = { services: { api: { healthcheck: {} }, web: {}, nginx: {} } };
test('legacy rollback requires account pause acknowledgement and uses only liveness', () => {
  assert.throws(() => planRollback(config, 'bdc749', 'location /api/ {', false));
  const plan = planRollback(config, 'bdc749', 'location /api/ {', true);
  assert.match(plan.nginx, /MAINTENANCE/);
  assert.match(plan.nginx, /READINESS_UNAVAILABLE/);
  assert.match(
    plan.nginx,
    /location ~\*/,
    'Gateway account gate must match case-insensitive Express routes',
  );
  assert.match(plan.config.services.api.healthcheck.test.join(' '), /8080\/health'/);
  assert.match(plan.config.services.api.image, /@sha256:/);
});
test('current rollback retains readiness and unknown/JWT-era tags are rejected', () => {
  assert.match(
    planRollback(
      config,
      '7eba339',
      'location /api/ {',
      false,
    ).config.services.api.healthcheck.test.join(' '),
    /health\/ready/,
  );
  assert.throws(() => planRollback(config, '3fa8d7f', 'location /api/ {', true));
  assert.throws(() =>
    planRollback(
      { ...config, services: { ...config.services, api: { ports: ['8080:8080'] } } },
      'bdc749',
      'location /api/ {',
      true,
    ),
  );
});
