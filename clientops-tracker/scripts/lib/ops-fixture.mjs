import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { request } from '@playwright/test';
import { readMailboxJson } from './mailbox-read.mjs';

export const local = process.argv.includes('--ops');
export const followup = process.argv.includes('--followup');
export const published = process.argv.includes('--published=7eba339');
export const project = published
  ? 'clientops-release-7eba339'
  : followup
    ? 'clientops-followup'
    : local
      ? 'clientops-ops'
      : 'clientops-hardening';
export const database = published
  ? 'clientops_release_7eba339_demo'
  : followup
    ? 'clientops_followup_demo'
    : local
      ? 'clientops_ops_demo'
      : 'clientops_hardening_demo';
export const origin = `https://localhost:${published ? 8454 : followup ? 8456 : local ? 8452 : 8443}`;
export const mailbox = `http://localhost:${published ? 8034 : followup ? 8036 : local ? 8032 : 8025}`;
export const keys = published
  ? {
      session: readFileSync('test-results/tls/release-7eba339/session-secret', 'utf8'),
      mail: readFileSync('test-results/tls/release-7eba339/mail-key', 'utf8'),
    }
  : JSON.parse(readFileSync(`test-results/tls/${project}-keys.json`, 'utf8'));
export const environment = {
  ...process.env,
  HARDENING_DATABASE: database,
  HTTPS_PORT: followup ? '8456' : local ? '8452' : '8443',
  MAIL_PORT: followup ? '8036' : local ? '8032' : '8025',
  ...(keys.runtime
    ? {
        RUNTIME_DATABASE_URL: `postgresql://clientops_runtime:${keys.runtime}@postgres:5432/${database}`,
      }
    : {}),
  HARDENING_API_IMAGE: `${project}-api:local`,
  HARDENING_WEB_IMAGE: `${project}-web:local`,
  SESSION_SECRET: keys.session,
  MAIL_ENCRYPTION_KEY: keys.mail,
  DEMO_MODE: 'true',
};
export function docker(args, options = {}) {
  return execFileSync('docker', args, {
    env: environment,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 180000,
    ...options,
  })?.trim();
}
export const compose = (args, options) =>
  docker(
    published
      ? [
          'compose',
          '-p',
          project,
          '-f',
          `test-results/tls/release-7eba339/${project}.json`,
          ...args,
        ]
      : [
          'compose',
          '-p',
          project,
          '--env-file',
          '.env.hardening.example',
          '-f',
          'docker-compose.hardening.yml',
          ...args,
        ],
    options,
  );
export const query = (sql) =>
  compose([
    'exec',
    '-T',
    'postgres',
    'psql',
    '-v',
    'ON_ERROR_STOP=1',
    '-U',
    'hardening',
    '-d',
    database,
    '-Atc',
    sql,
  ]);
export async function context(baseURL = origin) {
  return request.newContext({ baseURL, ignoreHTTPSErrors: true, timeout: 12000 });
}
export async function mutation(api, path, data, method = 'post') {
  const csrf = (await (await api.get('/api/auth/csrf')).json()).data.csrfToken;
  return api[method](path, { data, headers: { 'X-CSRF-Token': csrf } });
}
export async function waitFor(check, message, timeout = 120000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(message);
}
export async function mailMessages(email) {
  const inbox = await readMailboxJson(`${mailbox}/api/v1/messages`);
  return inbox.messages.filter((item) => item.To.some((recipient) => recipient.Address === email));
}
export async function mailToken(email, reset = false, exclude = '', ignoredMessageIds = []) {
  let token;
  await waitFor(async () => {
    for (const message of await mailMessages(email)) {
      if (ignoredMessageIds.includes(message.ID)) continue;
      if (!message.Subject.includes(reset ? 'Reset' : 'invitation')) continue;
      const body = await readMailboxJson(`${mailbox}/api/v1/message/${message.ID}`);
      const candidate = body.Text.match(/#token=([a-f0-9]{64})/)?.[1];
      if (candidate && candidate !== exclude) {
        token = candidate;
        return true;
      }
    }
    return false;
  }, 'Expected fictional account message was not delivered');
  return token;
}
