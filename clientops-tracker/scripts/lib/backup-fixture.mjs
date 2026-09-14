import { mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { compose, project, keys, database } from './ops-fixture.mjs';

const privateDir = resolve(`test-results/tls/${project}-backup`);
mkdirSync(privateDir, { recursive: true });
const passwordFile = resolve(privateDir, 'restic-password');
if (!existsSync(passwordFile))
  writeFileSync(passwordFile, randomBytes(32).toString('hex'), { mode: 0o600 });
writeFileSync(resolve(privateDir, 'alert-curl.conf'), 'url = "http://alerts:8099/alerts"\n', {
  mode: 0o600,
});
const config = JSON.parse(compose(['config', '--format', 'json']));
config.volumes.operations_state = { name: `${project}_operations_state` };
config.volumes.encrypted_backup = { name: `${project}_encrypted_backup` };
config.volumes.backup_secrets = { name: `${project}_backup_secrets` };
// Linux CI files belong to the runner UID. The restricted operator has no DAC override.
// A networkless fixture initializer copies only these two files to a root-owned private volume.
config.services['prepare-backup'] = {
  image: config.services.postgres.image,
  user: '0:0',
  network_mode: 'none',
  read_only: true,
  entrypoint: ['sh', '-eu', '-c'],
  command: [
    'cp /input/restic-password /secrets/restic-password; cp /input/alert-curl.conf /secrets/alert-curl.conf; chown 0:0 /secrets /secrets/restic-password /secrets/alert-curl.conf; chmod 700 /secrets; chmod 600 /secrets/restic-password /secrets/alert-curl.conf',
  ],
  volumes: [`${privateDir}:/input:ro`, 'backup_secrets:/secrets'],
};
config.services.operations = {
  image: 'clientops-operations:local',
  read_only: true,
  tmpfs: ['/tmp'],
  cap_drop: ['ALL'],
  security_opt: ['no-new-privileges:true'],
  environment: {
    OPS_MODE: 'disposable',
    PGHOST: 'postgres',
    PGUSER: 'clientops_backup',
    PGPASSWORD: keys.backup,
    PGDATABASE: database,
    RESTIC_REPOSITORY: '/repository',
    CERT_MIN_SECONDS: '86400',
  },
  volumes: [
    'operations_state:/state',
    'encrypted_backup:/repository',
    'backup_secrets:/run/secrets:ro',
    `${resolve('test-results/tls')}:/certs:ro`,
  ],
};
config.services.alerts = {
  image: config.services.api.image,
  command: ['node', '/fixture/alert-server.mjs'],
  volumes: [`${resolve('scripts/fixtures/alert-server.mjs')}:/fixture/alert-server.mjs:ro`],
};
const configPath = resolve(privateDir, 'compose.json');
writeFileSync(configPath, JSON.stringify(config), { mode: 0o600 });
export function ops(args, raw = false) {
  const output = execFileSync('docker', ['compose', '-p', project, '-f', configPath, ...args], {
    encoding: raw ? undefined : 'utf8',
    timeout: 180000,
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return raw ? output : output.trim();
}
export const job = (action, extra = []) =>
  ops(['run', '--rm', '--no-deps', ...extra, 'operations', action]);
export function backupDump() {
  job('backup');
  return ops(
    [
      'run',
      '--rm',
      '--no-deps',
      '-e',
      'RESTIC_PASSWORD_FILE=/run/secrets/restic-password',
      '--entrypoint',
      'restic',
      'operations',
      'dump',
      '--host',
      'clientops',
      '--tag',
      'clientops',
      'latest',
      '/clientops.dump',
    ],
    true,
  );
}
