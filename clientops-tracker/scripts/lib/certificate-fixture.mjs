import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';

export async function verifyCertificateHook({ config, state, directory, saveConfig, dc }) {
  const openssl =
    process.env.OPENSSL_BIN ??
    (process.platform === 'win32' ? 'C:\\Program Files\\Git\\usr\\bin\\openssl.exe' : 'openssl');
  const certs = `${directory}/certificates-${Date.now()}`;
  const lineage = `${certs}-renewed`;
  mkdirSync(certs, { mode: 0o700 });
  mkdirSync(lineage, { mode: 0o700 });
  const ssl = (args) => execFileSync(openssl, args, { stdio: 'pipe', timeout: 30000 });
  ssl([
    'req',
    '-x509',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    `${directory}/ca.key`,
    '-out',
    `${certs}/cert.pem`,
    '-days',
    '90',
    '-subj',
    '/CN=ClientOps disposable authority',
  ]);
  const extension = `${directory}/extensions.cnf`;
  writeFileSync(
    extension,
    'subjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=CA:FALSE\n',
    { mode: 0o600 },
  );
  for (const [folder, serial] of [
    [certs, '101'],
    [lineage, '102'],
  ]) {
    ssl([
      'req',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-keyout',
      `${folder}/privkey.pem`,
      '-out',
      `${folder}/request.csr`,
      '-subj',
      '/CN=localhost',
    ]);
    ssl([
      'x509',
      '-req',
      '-in',
      `${folder}/request.csr`,
      '-CA',
      `${certs}/cert.pem`,
      '-CAkey',
      `${directory}/ca.key`,
      '-set_serial',
      serial,
      '-out',
      `${folder}/fullchain.pem`,
      '-days',
      '30',
      '-extfile',
      extension,
    ]);
  }
  const nginx = `${directory}/nginx.conf`;
  writeFileSync(nginx, readFileSync('nginx/production.conf'), { mode: 0o600 });
  config.services.nginx.volumes = [
    { type: 'bind', source: nginx, target: '/etc/nginx/conf.d/default.conf', read_only: true },
    { type: 'bind', source: certs, target: '/etc/nginx/tls', read_only: true },
  ];
  config.services.operations.volumes = config.services.operations.volumes.map((volume) =>
    typeof volume === 'string' && volume.endsWith(':/certs:ro') ? `${certs}:/certs:ro` : volume,
  );
  saveConfig();
  writeFileSync(`${state}/current.json`, JSON.stringify(config), { mode: 0o600 });
  dc(['up', '-d', '--no-deps', '--force-recreate', '--wait', 'nginx']);
  // Verify in the Compose network: host antivirus may replace localhost certificates.
  const servedSerial = () => {
    dc(['run', '--rm', '--no-deps', 'operations', 'readiness']);
    const result = dc([
      'run',
      '--rm',
      '--no-deps',
      '--entrypoint',
      'sh',
      'operations',
      '-ec',
      'openssl s_client -connect nginx:443 -servername localhost -CAfile /certs/cert.pem -verify_return_error </dev/null >/tmp/peer.pem 2>/dev/null; openssl x509 -in /tmp/peer.pem -noout -serial',
    ]);
    return String(result).trim().replace('serial=', '');
  };
  assert.equal(await servedSerial(), '65');
  const expectSerial = async (expected) => {
    const deadline = Date.now() + 30000;
    for (;;) {
      if (servedSerial() === expected) return;
      if (Date.now() >= deadline)
        throw new Error('Nginx did not serve the renewed certificate within 30 seconds.');
      await new Promise((done) => setTimeout(done, 500));
    }
  };
  const hook = () =>
    execFileSync(process.execPath, ['scripts/renew-certificate.mjs'], {
      env: {
        ...process.env,
        DEPLOYMENT_STATE_DIR: state,
        TLS_CERTS_DIR: certs,
        RENEWED_LINEAGE: lineage,
        TLS_RENEWAL_LINEAGE: lineage,
      },
      stdio: 'pipe',
      timeout: 60000,
    });
  hook();
  await new Promise((resolve) => setTimeout(resolve, 1000));
  await expectSerial('66');
  assert(existsSync(`${state}/certificate.ok`));
  const previous = readFileSync(`${certs}/fullchain.pem`);
  // Wrong key is rejected before installation and sends a local capture-only failure alert.
  copyFileSync(`${directory}/ca.key`, `${lineage}/privkey.pem`);
  assert.throws(hook);
  assert(readFileSync(`${certs}/fullchain.pem`).equals(previous));
  assert(existsSync(`${state}/certificate.failed`));
  assert.equal(await servedSerial(), '66');
  // Correct key, invalid Nginx config: restore the certificate pair and retain failure state.
  copyFileSync(`${certs}/privkey.pem`, `${lineage}/privkey.pem`);
  ssl([
    'req',
    '-new',
    '-key',
    `${lineage}/privkey.pem`,
    '-out',
    `${lineage}/request.csr`,
    '-subj',
    '/CN=localhost',
  ]);
  ssl([
    'x509',
    '-req',
    '-in',
    `${lineage}/request.csr`,
    '-CA',
    `${certs}/cert.pem`,
    '-CAkey',
    `${directory}/ca.key`,
    '-set_serial',
    '103',
    '-out',
    `${lineage}/fullchain.pem`,
    '-days',
    '30',
    '-extfile',
    extension,
  ]);
  writeFileSync(nginx, 'invalid_fixture_directive;\n', { mode: 0o600 });
  assert.throws(hook);
  assert(readFileSync(`${certs}/fullchain.pem`).equals(previous));
  writeFileSync(nginx, readFileSync('nginx/production.conf'), { mode: 0o600 });
  hook();
  assert(!existsSync(`${state}/certificate.failed`));
  await expectSerial('67');
  return {
    privateCaOnly: true,
    actualNginxReload: true,
    servedSerialChanged: true,
    wrongKeyRejectedAndAlerted: true,
    nginxFailureRestoredPair: true,
    trustedPublicIssuance: 'Not performed',
  };
}
