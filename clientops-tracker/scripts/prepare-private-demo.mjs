import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { prepareShipmentDemo } from './lib/shipment-demo.mjs';
import { compose, origin, privateDemo } from './lib/ops-fixture.mjs';

assert.equal(privateDemo, true, 'Use --private-demo, never a customer installation.');
compose([
  'exec',
  '-T',
  'api',
  'node',
  '-e',
  "if (process.env.DEPLOYMENT_MODE !== 'disposable' || process.env.DEMO_MODE !== 'true' || process.env.SMTP_MODE !== 'capture' || process.env.SMTP_HOST !== 'mailpit' || process.env.DISPOSABLE_DATABASE_NAME !== 'clientops_private_demo') process.exit(1)",
]);
const file = 'test-results/private-demo-record.json';
if (!existsSync(file) || process.argv.includes('--new-request')) {
  process.env.E2E_ALLOW_DISPOSABLE_DEMO = 'true';
  const records = await prepareShipmentDemo(origin);
  writeFileSync(file, JSON.stringify(records, null, 2));
}
const { ticketId, title } = JSON.parse(readFileSync(file, 'utf8'));
assert.match(ticketId, /^[a-f0-9-]{36}$/);
console.log(
  `${title}\n${origin}/tickets/${ticketId}#delivery\nSign in using Continue as Client. Use Logout before switching roles.\nExisting requests are preserved. --new-request creates a new rehearsal, never a reset.`,
);
