import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { planRollback } from './lib/rollback-plan.mjs';
import { deploymentLock } from './lib/deployment.mjs';

// No migration reversal, database reset, automatic fallback, or unpinned image selection.
const options = Object.fromEntries(
  process.argv.slice(2).map((arg) => arg.replace(/^--/, '').split('=')),
);
if (
  !options.config ||
  !options.target ||
  !options['confirm-project'] ||
  !options['state-dir'] ||
  options['schema-reviewed'] !== 'true'
)
  throw new Error(
    'Supply --config=<private-json> --state-dir=<stable-private-directory> --target=7eba339|bdc749 --confirm-project=<name> --schema-reviewed=true; review the applied schema first. Older releases also need --acknowledge-account-pause=true.',
  );
const original = JSON.parse(readFileSync(options.config, 'utf8'));
if (original.name !== options['confirm-project'])
  throw new Error('Compose project confirmation mismatch.');
const mount = original.services.nginx.volumes.find(
  (item) => item.target === '/etc/nginx/conf.d/default.conf',
);
const result = planRollback(
  original,
  options.target,
  readFileSync(mount.source, 'utf8'),
  options['acknowledge-account-pause'] === 'true',
);
const directory = dirname(resolve(options.config));
const state = resolve(options['state-dir']);
const unlock = deploymentLock(state);
const nginxPath = resolve(directory, 'rollback-nginx.conf');
const configPath = resolve(directory, 'rollback-compose.json');
let paused = false;
try {
  writeFileSync(nginxPath, result.nginx, { mode: 0o600 });
  result.config.services.nginx.volumes.find((item) => item.target === mount.target).source =
    nginxPath;
  writeFileSync(configPath, JSON.stringify(result.config), { mode: 0o600 });
  for (const image of [result.release.api, result.release.web])
    execFileSync('docker', ['pull', image], { stdio: 'inherit' });
  paused = true;
  writeFileSync(
    `${state}/blocked.json`,
    JSON.stringify({ rollback: result.release.revision, started: new Date().toISOString() }),
    { mode: 0o600 },
  );
  const writers = ['api', 'web', 'nginx', 'mail-worker', 'worker'].filter(
    (name) => original.services[name],
  );
  execFileSync('docker', ['compose', '-p', original.name, '-f', configPath, 'stop', ...writers], {
    stdio: 'inherit',
  });
  // Keep the proxy stopped until the private applications are healthy. Its health probe needs the API.
  execFileSync(
    'docker',
    [
      'compose',
      '-p',
      original.name,
      '-f',
      configPath,
      'up',
      '-d',
      '--no-build',
      '--no-deps',
      '--wait',
      '--wait-timeout',
      '90',
      'api',
      'web',
    ],
    { stdio: 'inherit' },
  );
  // The account-maintenance gate is already in the generated config before traffic is reopened.
  execFileSync(
    'docker',
    [
      'compose',
      '-p',
      original.name,
      '-f',
      configPath,
      'up',
      '-d',
      '--no-build',
      '--no-deps',
      '--force-recreate',
      '--wait',
      '--wait-timeout',
      '60',
      'nginx',
    ],
    { stdio: 'inherit' },
  );
  // Docker DNS may still cache the replaced API address. Retry only this read-only probe.
  const deadline = Date.now() + 30_000;
  for (;;) {
    try {
      execFileSync(
        'docker',
        [
          'compose',
          '-p',
          original.name,
          '-f',
          configPath,
          'exec',
          '-T',
          'nginx',
          'wget',
          '--no-check-certificate',
          '-T',
          '2',
          '-qO-',
          'https://127.0.0.1/api/health',
        ],
        { stdio: 'ignore', timeout: 5000 },
      );
      break;
    } catch {
      if (Date.now() >= deadline) throw new Error('Gateway liveness did not recover.');
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
  console.log(
    `Pinned rollback ${result.release.revision} started. Verify login, business workflow and organisation boundaries before reopening traffic. Account pause: ${result.release.accountPause}.`,
  );
} catch {
  try {
    if (paused)
      execFileSync(
        'docker',
        ['compose', '-p', original.name, '-f', configPath, 'stop', 'api', 'web', 'nginx'],
        { stdio: 'ignore', timeout: 60000 },
      );
  } catch {
    /* Operator must inspect actual container state if Docker is unavailable. */
  }
  console.error(
    'Rollback failed; leave traffic restricted and inspect the selected Compose project. No automatic alternative attempted.',
  );
  process.exitCode = 1;
} finally {
  unlock();
}
