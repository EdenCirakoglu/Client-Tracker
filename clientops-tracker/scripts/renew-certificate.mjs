import { execFileSync } from 'node:child_process';
import {
  copyFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
  unlinkSync,
  chmodSync,
} from 'node:fs';
import { resolve, isAbsolute } from 'node:path';
import { deploymentLock } from './lib/deployment.mjs';
import { createHash } from 'node:crypto';

const openssl =
  process.env.OPENSSL_BIN ??
  (process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl');
const run = (command, args, input) =>
  execFileSync(command === 'openssl' ? openssl : command, args, {
    input,
    timeout: 30000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
const state = process.env.DEPLOYMENT_STATE_DIR;
const destination = process.env.TLS_CERTS_DIR;
const lineage = process.env.RENEWED_LINEAGE;
let unlock;
let compose;
let replaced = false;
try {
  if (![state, destination, lineage].every((value) => value && isAbsolute(value)))
    throw new Error(
      'Certificate hook requires absolute state, destination and Certbot lineage paths.',
    );
  const configPath = `${state}/current.json`;
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const mount = config.services.nginx.volumes.find((volume) => volume.target === '/etc/nginx/tls');
  if (resolve(mount?.source ?? '') !== resolve(destination))
    throw new Error('Certificate destination does not match the deployed Nginx mount.');
  compose = (args) => run('docker', ['compose', '-p', config.name, '-f', configPath, ...args]);
  if (
    !process.env.TLS_RENEWAL_LINEAGE ||
    resolve(lineage) !== resolve(process.env.TLS_RENEWAL_LINEAGE)
  )
    throw new Error('Unapproved certificate lineage.');
  unlock = deploymentLock(state);
  if (existsSync(`${state}/blocked.json`))
    throw new Error('Deployment recovery is pending; retry the hook after review.');
  const certificate = `${lineage}/fullchain.pem`;
  const key = `${lineage}/privkey.pem`;
  run('openssl', ['x509', '-checkend', '604800', '-noout', '-in', certificate]);
  run('openssl', [
    'x509',
    '-checkhost',
    new URL(config.services.api.environment.APP_ORIGIN).hostname,
    '-noout',
    '-in',
    certificate,
  ]);
  const publicPem = run('openssl', ['x509', '-pubkey', '-noout', '-in', certificate]);
  const publicDer = run('openssl', ['pkey', '-pubin', '-outform', 'DER'], publicPem);
  const privateDer = run('openssl', ['pkey', '-in', key, '-pubout', '-outform', 'DER']);
  if (!publicDer.equals(privateDer)) throw new Error('Certificate and private key do not match.');
  // Preserve the old pair until both Nginx validation and reload have succeeded.
  for (const file of ['fullchain.pem', 'privkey.pem']) {
    copyFileSync(`${destination}/${file}`, `${destination}/${file}.previous`);
    chmodSync(`${destination}/${file}.previous`, 0o600);
  }
  replaced = true;
  for (const file of ['fullchain.pem', 'privkey.pem']) {
    copyFileSync(`${lineage}/${file}`, `${destination}/${file}`);
    chmodSync(`${destination}/${file}`, 0o600);
  }
  // Docker Desktop bind propagation may lag host writes. Do not acknowledge an old pair.
  const deadline = Date.now() + 30000;
  for (;;) {
    const matches = ['fullchain.pem', 'privkey.pem'].every((file) => {
      const expected = createHash('sha256')
        .update(readFileSync(`${destination}/${file}`))
        .digest('hex');
      const actual = compose(['exec', '-T', 'nginx', 'sha256sum', `/etc/nginx/tls/${file}`])
        .toString()
        .split(/\s/)[0];
      return actual === expected;
    });
    if (matches) break;
    if (Date.now() >= deadline) throw new Error('Certificate mount did not update.');
    await new Promise((done) => setTimeout(done, 250));
  }
  compose(['exec', '-T', 'nginx', 'nginx', '-t']);
  compose(['exec', '-T', 'nginx', 'nginx', '-s', 'reload']);
  writeFileSync(`${state}/certificate.ok`, new Date().toISOString(), { mode: 0o600 });
  if (existsSync(`${state}/certificate.failed`)) unlinkSync(`${state}/certificate.failed`);
  for (const file of ['fullchain.pem', 'privkey.pem'])
    unlinkSync(`${destination}/${file}.previous`);
  console.log(
    'Certificate pair validated, installed and Nginx reload acknowledged. Verify the served serial and chain externally.',
  );
} catch {
  if (replaced) {
    try {
      for (const file of ['fullchain.pem', 'privkey.pem'])
        copyFileSync(`${destination}/${file}.previous`, `${destination}/${file}`);
      compose(['exec', '-T', 'nginx', 'nginx', '-t']);
      compose(['exec', '-T', 'nginx', 'nginx', '-s', 'reload']);
    } catch {
      console.error('Previous certificate pair restored if possible; inspect Nginx privately.');
    }
  }
  if (state && isAbsolute(state) && existsSync(state))
    writeFileSync(`${state}/certificate.failed`, new Date().toISOString(), { mode: 0o600 });
  try {
    compose?.(['run', '--rm', '--no-deps', 'operations', 'notify']);
  } catch {
    console.error('Certificate failure alert could not be delivered.');
  }
  console.error(
    'Certificate deploy hook failed. No keys or certificate payloads logged. Inspect failure marker and retry explicitly.',
  );
  process.exitCode = 1;
} finally {
  unlock?.();
}
