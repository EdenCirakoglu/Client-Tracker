import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
  unlinkSync,
} from 'node:fs';
import { resolve, dirname } from 'node:path';
import {
  deploymentLock,
  executeDeployment,
  validateDeployment,
  validateDatabaseContinuity,
} from './lib/deployment.mjs';

const [action, ...args] = process.argv.slice(2);
const options = Object.fromEntries(
  args.map((arg) => {
    const index = arg.indexOf('=');
    return [arg.slice(2, index), arg.slice(index + 1)];
  }),
);
const run = (args, extra = {}) =>
  execFileSync('docker', args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 900000,
    maxBuffer: 16 * 1024 * 1024,
    ...extra,
  }).trim();
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const save = (file, data) => writeFileSync(file, JSON.stringify(data, null, 2), { mode: 0o600 });
let unlock;
try {
  if (!options.config || !options.project || !/^[a-f0-9]{40}$/.test(options.revision ?? ''))
    throw new Error(
      'Use prepare|apply --config=<private-json> --project=<exact-name> --revision=<full-sha>. Apply also requires --state-dir and --mode.',
    );
  const file = resolve(options.config);
  if (action === 'prepare') {
    if (!options.env || existsSync(file))
      throw new Error('Supply a private --env file and a new output config path.');
    const revision = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    if (
      revision !== options.revision ||
      execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim()
    )
      throw new Error('Prepare from a clean checkout of the reviewed revision.');
    const operatorTag = `clientops-operations:${revision}`;
    const env = { ...process.env, IMAGE_TAG: revision, OPERATIONS_IMAGE: operatorTag };
    const config = JSON.parse(
      run(
        [
          'compose',
          '-p',
          options.project,
          '--env-file',
          resolve(options.env),
          '-f',
          'docker-compose.prod.yml',
          '-f',
          'docker-compose.operations.yml',
          'config',
          '--format',
          'json',
        ],
        { env },
      ),
    );
    for (const service of ['api', 'web']) {
      const tag = config.services[service].image;
      console.log(`Pulling ${service} for reviewed revision ${revision}.`);
      run(['pull', tag]);
      const image = JSON.parse(run(['image', 'inspect', tag]))[0];
      if (image.Config.Labels?.['org.opencontainers.image.revision'] !== revision)
        throw new Error('Published image revision label mismatch.');
      const digest = image.RepoDigests.find((ref) =>
        ref.startsWith(`${tag.slice(0, tag.lastIndexOf(':'))}@sha256:`),
      );
      if (!digest) throw new Error('No registry digest found for published image.');
      for (const name of service === 'api' ? ['api', 'migrate', 'provision', 'bootstrap'] : ['web'])
        config.services[name].image = digest;
      console.log(`${service}: ${digest}`);
    }
    const build = [
      'build',
      '-f',
      'ops/Dockerfile',
      '--build-arg',
      `SOURCE_REVISION=${revision}`,
      '-t',
      operatorTag,
    ];
    if (process.env.BUILD_CA_FILE)
      build.push('--secret', `id=build_ca,src=${resolve(process.env.BUILD_CA_FILE)}`);
    run([...build, '.']);
    const operator = JSON.parse(run(['image', 'inspect', operatorTag]))[0];
    config.services.operations.image = operator.Id;
    config['x-clientops-release'] = revision;
    for (const service of Object.values(config.services)) delete service.build;
    mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
    const nginx = config.services.nginx.volumes.find(
      (volume) => volume.target === '/etc/nginx/conf.d/default.conf',
    );
    const nginxFile = resolve(dirname(file), 'nginx.conf');
    writeFileSync(nginxFile, readFileSync(nginx.source), { mode: 0o600, flag: 'wx' });
    nginx.source = nginxFile;
    writeFileSync(file, JSON.stringify(config, null, 2), { mode: 0o600, flag: 'wx' });
    console.log(
      `Prepared private configuration. Operator image built from reviewed source ${revision}; no application rebuild or publication.`,
    );
  } else if (action === 'apply') {
    if (!options['state-dir'])
      throw new Error('A stable private --state-dir shared with scheduled jobs is required.');
    const state = resolve(options['state-dir']);
    unlock = deploymentLock(state);
    if (existsSync(`${state}/blocked.json`) && options['resume-after-review'] !== 'true')
      throw new Error(
        'A previous deployment is blocked. Inspect it before --resume-after-review=true.',
      );
    const config = json(file);
    if (existsSync(`${state}/current.json`))
      validateDatabaseContinuity(json(`${state}/current.json`), config);
    validateDeployment(config, {
      ...options,
      fixture: options.fixture === 'true',
      provision: options['allow-provision'],
    });
    const compose = (args) => run(['compose', '-p', options.project, '-f', file, ...args]);
    const job = (service, args = []) =>
      compose(['run', '--rm', '-T', '--no-deps', service, ...args]);
    const database = config.services.postgres.environment.POSTGRES_DB;
    const owner = config.services.postgres.environment.POSTGRES_USER;
    const sql = (query) =>
      compose([
        'exec',
        '-T',
        'postgres',
        'psql',
        '-XAt',
        '-v',
        'ON_ERROR_STOP=1',
        '-U',
        owner,
        '-d',
        database,
        '-c',
        query,
      ]);
    const running = () =>
      run([
        'ps',
        '--filter',
        `label=com.docker.compose.project=${options.project}`,
        '--format',
        '{{.ID}} {{.Label "com.docker.compose.service"}}',
      ])
        .split('\n')
        .filter(Boolean)
        .map((line) => line.split(' '));
    const writers = ['api', 'web', 'nginx', 'worker', 'mail-worker'];
    const drain = () => {
      const ids = running()
        .filter(([, service]) => writers.includes(service))
        .map(([id]) => id);
      if (ids.length) run(['stop', '--time', '30', ...ids]);
    };
    await executeDeployment(options.mode, async (phase) => {
      console.log(`Deployment: ${phase}`);
      if (phase === 'preflight') {
        compose(['config', '--quiet']);
        for (const name of ['api', 'web', 'operations']) {
          const image = JSON.parse(run(['image', 'inspect', config.services[name].image]))[0];
          if (
            (options.fixture !== 'true' || name === 'operations') &&
            image.Config.Labels?.['org.opencontainers.image.revision'] !== options.revision
          )
            throw new Error('Image provenance mismatch; prepare the reviewed revision first.');
        }
        const allowed = [...writers, 'postgres', 'mailpit', 'alerts'];
        if (running().some(([, name]) => !allowed.includes(name)))
          throw new Error('Unexpected project job is running; stop it before deployment.');
      } else if (phase === 'repository-check' || phase === 'backup-check')
        job('operations', ['check']);
      else if (phase === 'database-check') {
        compose(['up', '-d', '--no-recreate', '--wait', '--wait-timeout', '60', 'postgres']);
        const count = Number(
          sql("SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"),
        );
        if ((options.mode === 'install') !== (count === 0))
          throw new Error(
            'Install requires an empty database; conversion/update requires populated schema.',
          );
        if (options.mode === 'update') job('api', ['node', 'dist/check-runtime-role.js']);
      } else if (phase === 'pause-writers') {
        save(`${state}/blocked.json`, {
          revision: options.revision,
          mode: options.mode,
          started: new Date().toISOString(),
        });
        drain();
      } else if (phase === 'quiescence-check') {
        const deadline = Date.now() + 5000;
        while (
          Number(
            sql(
              'SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND pid<>pg_backend_pid()',
            ),
          ) !== 0
        ) {
          if (Date.now() > deadline)
            throw new Error(
              'Other database connections remain; stop external writers/maintenance.',
            );
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      } else if (phase === 'backup') {
        if (options.mode === 'convert') {
          const privileged = structuredClone(config);
          const url = new URL(config.services.provision.environment.ADMIN_DATABASE_URL);
          Object.assign(privileged.services.operations.environment, {
            PGUSER: decodeURIComponent(url.username),
            PGPASSWORD: decodeURIComponent(url.password),
          });
          const privateFile = `${state}/conversion-backup.json`;
          save(privateFile, privileged);
          try {
            run([
              'compose',
              '-p',
              options.project,
              '-f',
              privateFile,
              'run',
              '--rm',
              '-T',
              '--no-deps',
              'operations',
              'backup',
            ]);
          } finally {
            unlinkSync(privateFile);
          }
        } else job('operations', ['backup']);
      } else if (phase === 'provision') job('provision');
      else if (phase === 'migrate') job('migrate');
      else if (phase === 'runtime-role-check') job('api', ['node', 'dist/check-runtime-role.js']);
      else if (phase === 'start-app')
        compose([
          'up',
          '-d',
          '--no-build',
          '--no-deps',
          '--wait',
          '--wait-timeout',
          '90',
          'api',
          'web',
          ...['worker', 'mail-worker'].filter((name) => config.services[name]),
        ]);
      else if (phase === 'start-gateway')
        compose([
          'up',
          '-d',
          '--no-build',
          '--no-deps',
          '--force-recreate',
          '--wait',
          '--wait-timeout',
          '60',
          'nginx',
        ]);
      else if (phase === 'readiness') job('operations', ['readiness']);
      else if (phase === 'record-success') {
        if (existsSync(`${state}/current.json`))
          save(`${state}/previous.json`, json(`${state}/current.json`));
        save(`${state}/current.next.json`, config);
        renameSync(`${state}/current.next.json`, `${state}/current.json`);
        unlinkSync(`${state}/blocked.json`);
      } else if (phase === 'stop-after-failure') drain();
      else if (phase === 'notify-failure') job('operations', ['notify']);
    });
    console.log(
      'Deployment passed readiness. Verify login, mail and tenant boundaries before opening staging traffic.',
    );
  } else throw new Error('Choose prepare or apply.');
} catch (error) {
  // Never echo Docker stderr, generated config or environment values on operational failure.
  console.error(
    error?.code || error?.status
      ? 'Deployment command failed. Inspect prerequisites privately; no raw container output logged.'
      : error.message,
  );
  process.exitCode = 1;
} finally {
  unlock?.();
}
