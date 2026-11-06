import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import https from 'node:https';
import { resolve } from 'node:path';

// Explicit digests only. A unique project is required; existing volumes are never reused.
const [revision, apiDigest, webDigest] = process.argv.slice(2);
assert.match(revision ?? '', /^[a-f0-9]{40}$/);
for (const digest of [apiDigest, webDigest]) assert.match(digest ?? '', /^sha256:[a-f0-9]{64}$/);
const instance = process.env.RELEASE_INSTANCE ?? '';
assert.match(instance, /^(?:[a-z0-9-]{1,20})?$/);
const project = `clientops-published-${revision.slice(0, 12)}${instance ? `-${instance}` : ''}`;
const database = `clientops_published_${revision.slice(0, 12)}_demo`;
const port = Number(process.env.RELEASE_HTTPS_PORT ?? 8464);
const subnet = process.env.RELEASE_SUBNET ?? '10.240.60.0/24';
const dir = resolve(`test-results/tls/${project}`);
const reportDir = resolve(`test-results/${project}`);
const run = (args, capture = false) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  })?.trim() ?? '';
const existing = run(
  ['volume', 'ls', '--filter', `label=com.docker.compose.project=${project}`, '-q'],
  true,
);
assert.equal(
  existing,
  '',
  'Existing verification volume: preserve it; do not rerun/reset this fixture.',
);
mkdirSync(dir, { recursive: true });
mkdirSync(reportDir, { recursive: true });
const cert = resolve(dir, 'cert.pem');
execFileSync(
  process.env.OPENSSL_PATH ??
    (process.platform === 'win32' ? 'C:/Program Files/Git/usr/bin/openssl.exe' : 'openssl'),
  [
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-days',
    '7',
    '-keyout',
    resolve(dir, 'key.pem'),
    '-out',
    cert,
    '-subj',
    '/CN=localhost',
    '-addext',
    'subjectAltName=DNS:localhost,IP:127.0.0.1',
  ],
  { stdio: 'ignore' },
);
const images = Object.fromEntries(
  [
    ['api', apiDigest],
    ['web', webDigest],
  ].map(([name, digest]) => [name, `ghcr.io/edencirakoglu/client-tracker-${name}@${digest}`]),
);
const inspected = {};
for (const [name, image] of Object.entries(images)) {
  run(['pull', image]);
  const info = JSON.parse(run(['image', 'inspect', image], true))[0];
  assert.equal(info.Config.Labels['org.opencontainers.image.revision'], revision);
  inspected[name] = { reference: image, imageId: info.Id, revision };
}
const environment = {
  NODE_ENV: 'production',
  DEPLOYMENT_MODE: 'disposable',
  DATABASE_URL: `postgresql://hardening:local_disposable_database_password@postgres:5432/${database}`,
  SESSION_SECRET: randomBytes(48).toString('hex'),
  MAIL_ENCRYPTION_KEY: randomBytes(32).toString('hex'),
  APP_ORIGIN: `https://localhost:${port}`,
  TRUST_PROXY: '1',
  DEMO_MODE: 'true',
  DISPOSABLE_DATABASE_NAME: database,
  SMTP_MODE: 'capture',
  SMTP_HOST: 'mailpit',
  SMTP_PORT: '1025',
};
const probe = (url) => ({
  test: [
    'CMD',
    'node',
    '-e',
    `fetch('${url}', {signal: AbortSignal.timeout(2500)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`,
  ],
  interval: '3s',
  timeout: '5s',
  retries: 30,
});
const config = resolve(dir, 'compose.json');
writeFileSync(
  config,
  JSON.stringify({
    services: {
      postgres: {
        image: 'postgres:16-alpine',
        environment: {
          POSTGRES_USER: 'hardening',
          POSTGRES_PASSWORD: 'local_disposable_database_password',
          POSTGRES_DB: database,
        },
        volumes: ['postgres_data:/var/lib/postgresql/data'],
        healthcheck: {
          test: ['CMD-SHELL', `pg_isready -U hardening -d ${database}`],
          interval: '2s',
          timeout: '3s',
          retries: 30,
        },
      },
      mailpit: { image: 'axllent/mailpit:v1.27.4' },
      api: {
        image: images.api,
        environment,
        volumes: [`${cert}:/tmp/clientops-fixture-ca.pem:ro`],
        healthcheck: probe('http://127.0.0.1:8080/health/ready'),
        depends_on: {
          postgres: { condition: 'service_healthy' },
          mailpit: { condition: 'service_started' },
        },
      },
      web: {
        image: images.web,
        healthcheck: probe('http://127.0.0.1:3000/login'),
        depends_on: { api: { condition: 'service_healthy' } },
      },
      nginx: {
        image: 'nginx:stable-alpine',
        ports: [`127.0.0.1:${port}:443`],
        volumes: [
          `${resolve('nginx/hardening.conf')}:/etc/nginx/conf.d/default.conf:ro`,
          `${dir}:/etc/nginx/tls:ro`,
        ],
        depends_on: {
          api: { condition: 'service_healthy' },
          web: { condition: 'service_healthy' },
        },
      },
    },
    volumes: { postgres_data: {} },
    networks: { default: { ipam: { config: [{ subnet }] } } },
  }),
  { mode: 0o600 },
);
const compose = (args, capture = false) =>
  run(['compose', '-p', project, '-f', config, ...args], capture);
const fingerprint = () =>
  JSON.parse(compose(['run', '--rm', '--no-deps', 'api', 'node', 'dist/fingerprint.js'], true));
const containerHttps = process.env.RELEASE_HTTPS_TRANSPORT === 'container';
const evidence = {
  revision,
  images: inspected,
  project,
  database,
  port,
  subnet,
  applicationImagesRebuilt: false,
  httpsTransport: containerHttps
    ? 'container with fixture CA and localhost hostname verification'
    : 'host with fixture CA',
  checkedAt: new Date().toISOString(),
  harnessSha: createHash('sha256')
    .update(readFileSync(new URL(import.meta.url)))
    .digest('hex'),
  checks: [],
};
const check = (name) => {
  evidence.checks.push(name);
  console.log(`PASS: ${name}`);
};
const ca = readFileSync(cert);
const client = (initialCookie = '') => {
  let cookie = initialCookie;
  const call = (method, path, data, csrf) =>
    new Promise((resolveResponse, reject) => {
      const payload = data === undefined ? undefined : JSON.stringify(data);
      const headers = {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(payload
          ? {
              'Content-Type': 'application/json',
              'Content-Length': Buffer.byteLength(payload),
            }
          : {}),
        ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
        Origin: environment.APP_ORIGIN,
      };
      if (containerHttps) {
        // Keep credentials on stdin/in memory, not in arguments, reports or container logs.
        const source = `const https=require('node:https'),fs=require('node:fs');
        const input=JSON.parse(fs.readFileSync(0,'utf8'));
        const req=https.request({hostname:'nginx',port:443,servername:'localhost',
          ca:fs.readFileSync('/tmp/clientops-fixture-ca.pem'),method:input.method,
          path:input.path,headers:{...input.headers,Host:'localhost'}},res=>{
          let body='';res.on('data',c=>body+=c);res.on('end',()=>console.log(JSON.stringify({
            status:res.statusCode,headers:res.headers,body:res.headers['content-type']?.includes('application/json')?JSON.parse(body):body})));});
        req.setTimeout(10000,()=>req.destroy(new Error('Fixture HTTPS timeout')));
        req.on('error',()=>process.exit(1));req.end(input.payload);`;
        try {
          const result = JSON.parse(
            execFileSync('docker', ['exec', '-i', `${project}-api-1`, 'node', '-e', source], {
              encoding: 'utf8',
              input: JSON.stringify({ method, path, payload, headers }),
              timeout: 20000,
              stdio: ['pipe', 'pipe', 'pipe'],
            }),
          );
          if (result.headers['set-cookie'])
            cookie = result.headers['set-cookie'].map((item) => item.split(';')[0]).join('; ');
          resolveResponse(result);
        } catch {
          reject(new Error('Container HTTPS request failed; no credentials logged.'));
        }
        return;
      }
      const request = https.request(
        `https://localhost:${port}${path}`,
        {
          ca,
          method,
          headers,
        },
        (response) => {
          const setCookie = response.headers['set-cookie'];
          if (setCookie) cookie = setCookie.map((item) => item.split(';')[0]).join('; ');
          let body = '';
          response.on('data', (chunk) => {
            body += chunk;
          });
          response.on('end', () =>
            resolveResponse({
              status: response.statusCode,
              headers: response.headers,
              body: response.headers['content-type']?.includes('application/json')
                ? JSON.parse(body)
                : body,
            }),
          );
        },
      );
      request.setTimeout(10000, () => request.destroy(new Error('HTTP verification timeout')));
      request.on('error', reject);
      request.end(payload);
    });
  return {
    call,
    cookie: () => cookie,
    async mutate(method, path, data) {
      const token = await call('GET', '/api/auth/csrf');
      assert.equal(token.status, 200);
      return call(method, path, data, token.body.data.csrfToken);
    },
  };
};
const login = async (email) => {
  const api = client();
  const result = await api.mutate('POST', '/api/auth/login', { email, password: 'password123' });
  assert.equal(result.status, 200);
  const cookie = result.headers['set-cookie'].find((item) =>
    item.startsWith('__Host-clientops.sid='),
  );
  for (const flag of ['HttpOnly', 'Secure', 'SameSite=Lax']) assert(cookie.includes(flag));
  return api;
};
try {
  compose(['config', '--quiet']);
  compose(['up', '-d', '--wait', 'postgres', 'mailpit']);
  compose(['run', '--rm', '--no-deps', 'api', 'node', 'dist/migrate.js']);
  compose([
    'run',
    '--rm',
    '--no-deps',
    '-e',
    'NODE_ENV=development',
    '-e',
    'SEED_RESET=true',
    'api',
    'node',
    'dist/seed.js',
  ]);
  const initial = fingerprint();
  compose(['run', '--rm', '--no-deps', 'api', 'node', 'dist/migrate.js']);
  assert.deepEqual(fingerprint(), initial);
  check('migrations and populated idempotent migration preserve business records');
  compose(['up', '-d', '--no-build', '--wait']);
  const anonymous = client();
  assert.equal((await anonymous.call('GET', '/login')).status, 200);
  assert.equal((await anonymous.call('GET', '/api/health/ready')).status, 200);
  check('web, HTTPS proxy and database readiness');
  const admin = await login('admin@example.com');
  const northstar = await login('client@example.com');
  const bluewave = await login('bluewave@example.com');
  check('login with production Secure HttpOnly SameSite cookies');
  const projects = (await northstar.call('GET', '/api/projects')).body.data;
  const created = await northstar.mutate('POST', '/api/tickets', {
    projectId: projects[0].id,
    title: 'Delivery export omits the approval date',
    description: 'Please include the agreed date in the delivery record.',
    category: 'BUG',
    priority: 'MEDIUM',
  });
  assert.equal(created.status, 201);
  const id = created.body.data.id;
  assert.equal(
    (await northstar.call('POST', `/api/tickets/${id}/comments`, { body: 'Rejected without CSRF' }))
      .status,
    403,
  );
  assert.equal(
    (
      await northstar.mutate('POST', `/api/tickets/${id}/comments`, {
        body: 'The export from today is affected.',
        isInternal: false,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await admin.mutate('POST', `/api/tickets/${id}/comments`, {
        body: 'Internal reproduction confirmed.',
        isInternal: true,
      })
    ).status,
    201,
  );
  assert.equal(
    (await admin.mutate('PATCH', `/api/tickets/${id}`, { status: 'IN_PROGRESS', priority: 'HIGH' }))
      .status,
    200,
  );
  const comments = (await northstar.call('GET', `/api/tickets/${id}/comments`)).body.data;
  assert.equal(comments.length, 1);
  assert.equal(comments[0].isInternal, false);
  assert([403, 404].includes((await bluewave.call('GET', `/api/tickets/${id}`)).status));
  assert(
    [403, 404].includes(
      (await bluewave.mutate('POST', `/api/tickets/${id}/comments`, { body: 'Other organisation' }))
        .status,
    ),
  );
  check(
    'ticket creation, public/internal comments, status update, CSRF and organisation isolation',
  );
  compose(['stop', 'postgres']);
  try {
    assert.equal((await anonymous.call('GET', '/api/health')).status, 200);
    assert.equal((await anonymous.call('GET', '/api/health/ready')).status, 503);
    assert.equal((await admin.call('GET', '/api/auth/me')).status, 503);
  } finally {
    compose(['up', '-d', '--wait', 'postgres']);
  }
  assert.equal((await anonymous.call('GET', '/api/health/ready')).status, 200);
  assert.equal((await admin.call('GET', '/api/auth/me')).status, 200);
  check(
    'database outage returns readiness/authentication 503, liveness stays 200, recovery succeeds',
  );
  const before = fingerprint();
  const ticketBefore = (await admin.call('GET', `/api/tickets/${id}`)).body;
  compose(['down']);
  compose(['up', '-d', '--no-build', '--wait']);
  assert.deepEqual(fingerprint(), before);
  assert.deepEqual((await admin.call('GET', `/api/tickets/${id}`)).body, ticketBefore);
  assert.equal((await admin.call('GET', '/api/auth/me')).status, 200);
  check('full container recreation preserves twelve-table fingerprint, ticket and session');
  const replay = client(admin.cookie());
  assert.equal((await admin.mutate('POST', '/api/auth/logout')).status, 200);
  assert.equal((await replay.call('GET', '/api/auth/me')).status, 401);
  check('logout revokes copied session cookie');
  evidence.fingerprint = before;
  evidence.ticketId = id;
  evidence.result = 'passed';
} catch (error) {
  evidence.result = 'failed';
  // Never serialize HTTP bodies, cookies, queued tokens or environment configuration.
  evidence.failure = { name: error.name, message: error.message.slice(0, 180) };
  throw error;
} finally {
  writeFileSync(resolve(reportDir, 'verification.json'), JSON.stringify(evidence, null, 2));
  console.log(`Evidence: test-results/${project}/verification.json`);
}
