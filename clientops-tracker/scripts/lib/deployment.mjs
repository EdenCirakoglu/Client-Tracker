import { mkdirSync, rmdirSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';

export function deploymentLock(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const lock = `${directory}/lock`;
  try {
    mkdirSync(lock, { mode: 0o700 });
  } catch {
    throw new Error('Deployment/maintenance lock exists. Inspect its owner before recovery.');
  }
  return () => rmdirSync(lock);
}

export function validateDatabaseContinuity(previous, next) {
  const identity = (config) => {
    const service = config.services.postgres;
    return {
      project: config.name,
      image: service.image,
      database: service.environment.POSTGRES_DB,
      owner: service.environment.POSTGRES_USER,
      mounts: service.volumes,
      volumes: (service.volumes ?? []).map((mount) =>
        typeof mount === 'object' && mount.type === 'volume'
          ? config.volumes?.[mount.source]
          : mount,
      ),
    };
  };
  if (!isDeepStrictEqual(identity(previous), identity(next)))
    throw new Error(
      'Database identity, storage or PostgreSQL image changed. Use a separately reviewed database migration, not an application update.',
    );
}

export function validateDeployment(config, options) {
  if (!/^[a-z0-9][a-z0-9_-]*$/.test(options.project ?? '') || config.name !== options.project)
    throw new Error('Exact Compose project confirmation is required.');
  if (!/^[a-f0-9]{40}$/.test(options.revision ?? ''))
    throw new Error('A full reviewed revision is required.');
  if (!['install', 'convert', 'update'].includes(options.mode))
    throw new Error('Choose install, convert or update explicitly.');
  for (const name of ['api', 'web', 'postgres', 'nginx', 'migrate', 'provision', 'operations'])
    if (!config.services?.[name]) throw new Error(`Missing ${name} service.`);
  const { api, migrate, provision, operations, postgres } = config.services;
  if (api.ports?.length || postgres.ports?.length)
    throw new Error('API and PostgreSQL must not publish host ports.');
  const database = postgres.environment.POSTGRES_DB;
  for (const [service, role] of [
    [api, 'clientops_runtime'],
    [migrate, 'clientops_migrator'],
  ]) {
    const url = new URL(service.environment.DATABASE_URL);
    if (url.username !== role || url.hostname !== 'postgres' || url.pathname !== `/${database}`)
      throw new Error(
        'Use separate runtime/migration identities and the postgres network hostname.',
      );
  }
  if (
    operations.environment.PGUSER !== 'clientops_backup' ||
    operations.environment.PGDATABASE !== database ||
    operations.environment.PGHOST !== 'postgres'
  )
    throw new Error('Operations requires the dedicated read-only backup identity.');
  if (options.mode !== 'update' && options.provision !== database)
    throw new Error('Install/conversion requires --allow-provision=<exact-database>.');
  if (options.mode === 'update' && options.provision)
    throw new Error('Routine updates cannot provision database roles.');
  if (
    ['ADMIN_DATABASE_URL', 'MIGRATION_PASSWORD', 'BACKUP_PASSWORD', 'RUNTIME_PASSWORD'].some(
      (name) => api.environment[name],
    )
  )
    throw new Error('Privileged credentials must not be passed to the API.');
  if (!provision.environment.ADMIN_DATABASE_URL)
    throw new Error('The separate provision job needs an owner URL.');
  const owner = new URL(provision.environment.ADMIN_DATABASE_URL);
  if (
    owner.hostname !== 'postgres' ||
    owner.pathname !== `/${database}` ||
    decodeURIComponent(owner.username) !== postgres.environment.POSTGRES_USER
  )
    throw new Error('Provisioning must target this Compose database and its initial owner.');
  if (api.image !== migrate.image || api.image !== provision.image)
    throw new Error('API, migration and provisioning must use the same reviewed image.');
  if (options.fixture) {
    if (
      api.environment.DEPLOYMENT_MODE !== 'disposable' ||
      operations.environment.OPS_MODE !== 'disposable' ||
      !/^clientops_.*_demo$/.test(database) ||
      !options.project.startsWith('clientops-deploy-')
    )
      throw new Error(
        'Fixture bypass is restricted to explicitly named isolated deployment rehearsals.',
      );
  } else {
    if (
      api.environment.DEPLOYMENT_MODE !== 'production' ||
      api.environment.DEMO_MODE !== 'false' ||
      api.environment.SMTP_MODE !== 'smtp' ||
      operations.environment.OPS_MODE !== 'production'
    )
      throw new Error('Production deployment rejects demo/capture configuration.');
    for (const name of ['api', 'web', 'migrate', 'provision'])
      if (!/^ghcr\.io\/.+@sha256:[a-f0-9]{64}$/.test(config.services[name].image))
        throw new Error('Pull and resolve published application images to registry digests first.');
  }
  if (config['x-clientops-release'] !== options.revision)
    throw new Error('Prepared configuration belongs to a different source revision.');
}

// Operations are injected only to test ordering/failure policy. The CLI supplies real Docker commands.
export async function executeDeployment(mode, operation) {
  let paused = false;
  let phase = 'preflight';
  const step = async (name) => {
    phase = name;
    await operation(name);
  };
  try {
    await step('preflight');
    await step('repository-check');
    await step('database-check');
    paused = true; // Include partially failed drain operations in fail-closed handling.
    await step('pause-writers');
    await step('quiescence-check');
    if (mode !== 'install') {
      await step('backup');
      await step('backup-check');
    }
    if (mode !== 'update') await step('provision');
    await step('migrate');
    await step('runtime-role-check');
    await step('start-app');
    await step('start-gateway');
    await step('readiness');
    await step('record-success');
  } catch {
    if (paused) {
      await operation('stop-after-failure').catch(() => {});
      await operation('notify-failure').catch(() => {});
    }
    throw new Error(
      `Deployment failed at ${phase}. ${paused ? 'Maintenance remains blocked; verify writers are stopped and review database recovery before retrying.' : 'No migration or role conversion was attempted.'} No automatic rollback.`,
    );
  }
}
