import { validateDeployment } from './deployment.mjs';

const fail = (message) => {
  throw new Error(message);
};

// Inspect deploy.mjs's private rendered configuration; never print its secret values.
export function validatePrivateStaging(config, { revision, mode }) {
  if (config?.name !== 'clientops-staging') fail('Use the dedicated clientops-staging project.');
  const services = config.services;
  if (services?.postgres?.environment?.POSTGRES_DB !== 'clientops_staging')
    fail('Use the dedicated clientops_staging database.');
  try {
    validateDeployment(config, {
      revision,
      mode,
      project: 'clientops-staging',
      provision: mode === 'update' ? undefined : 'clientops_staging',
    });
  } catch {
    fail('Prepared release, restricted database roles or production-mode contract is invalid.');
  }
  for (const [name, service] of Object.entries(services)) {
    if (service.build || service.network_mode || service.privileged)
      fail('Staging rejects rebuilds, alternate network modes and privileged containers.');
    if (name !== 'nginx' && service.ports?.length)
      fail('Only Nginx may publish ports, including operator-profile services.');
  }
  const ports = services.nginx.ports;
  if (
    !Array.isArray(ports) ||
    ports.length !== 2 ||
    !ports.every(
      (port) =>
        typeof port === 'object' &&
        port.host_ip === '127.0.0.1' &&
        String(port.published) === String(port.target) &&
        [80, 443].includes(Number(port.target)) &&
        port.protocol === 'tcp',
    ) ||
    new Set(ports.map((port) => Number(port.target))).size !== 2
  )
    fail('Use rendered loopback-only Nginx TCP ports 80 and 443; access through SSH.');
  const env = services.api.environment;
  if (
    env.NODE_ENV !== 'production' ||
    String(env.TRUST_PROXY) !== '1' ||
    env.DEPLOYMENT_MODE !== 'production' ||
    env.DEMO_MODE !== 'false' ||
    env.SMTP_MODE !== 'smtp'
  )
    fail('Require production cookies, one private proxy hop, no demo and real SMTP mode.');
  let origin;
  try {
    origin = new URL(env.APP_ORIGIN);
  } catch {
    fail('Set the trusted staging HTTPS origin, not a malformed or placeholder URL.');
  }
  if (
    origin.protocol !== 'https:' ||
    origin.port !== '8443' ||
    origin.username ||
    origin.password ||
    origin.pathname !== '/' ||
    origin.search ||
    origin.hash ||
    !origin.hostname.includes('.') ||
    /^[\d.]+$/.test(origin.hostname) ||
    /(?:^|\.)(?:localhost|example|invalid|test)$/.test(origin.hostname) ||
    /(?:^|\.)example\.(?:com|org|net)$/.test(origin.hostname)
  )
    fail('Use an owned staging DNS name with https and SSH browser port 8443.');
  const { operations, provision, migrate, postgres } = services;
  if (!/^sha256:[a-f0-9]{64}$/.test(operations.image ?? ''))
    fail('Pin the separately built operator image ID from the same reviewed source.');
  if (operations.environment.MONITOR_ORIGIN !== env.APP_ORIGIN)
    fail('Monitor and browser origins must match the staging origin.');
  const repository = operations.environment.RESTIC_REPOSITORY ?? '';
  if (!/^s3:https:\/\//.test(repository) || !/\/clientops-staging(?:\/|$)/.test(repository))
    fail('Use an encrypted off-host S3 repository with a dedicated clientops-staging prefix.');
  for (const service of [postgres, operations]) {
    const mount = service.volumes?.find(
      (volume) => volume.target === (service === postgres ? '/var/lib/postgresql/data' : '/state'),
    );
    const volume = config.volumes?.[mount?.source];
    if (
      mount?.type !== 'volume' ||
      !volume ||
      volume.external ||
      !volume.name?.startsWith('clientops-staging_')
    )
      fail('Database and operations state must use dedicated non-external staging volumes.');
  }
  let passwords;
  try {
    passwords = [
      provision.environment.ADMIN_DATABASE_URL,
      migrate.environment.DATABASE_URL,
      env.DATABASE_URL,
    ].map((value) => decodeURIComponent(new URL(value).password));
    passwords.push(operations.environment.PGPASSWORD);
  } catch {
    fail('Database credentials are malformed; inspect only the private configuration.');
  }
  if (
    passwords.some((value) => typeof value !== 'string' || value.length < 24) ||
    new Set(passwords).size !== 4 ||
    typeof env.SESSION_SECRET !== 'string' ||
    env.SESSION_SECRET.length < 32 ||
    !/^[a-f0-9]{64}$/i.test(env.MAIL_ENCRYPTION_KEY ?? '') ||
    passwords.includes(env.SESSION_SECRET) ||
    env.SESSION_SECRET === env.MAIL_ENCRYPTION_KEY ||
    env.SESSION_SECRET === undefined
  )
    fail('Supply independent strong database, session and outbox secrets privately.');
  if (
    [...passwords, env.SESSION_SECRET].some((value) =>
      /change[-_ ]?me|replace|placeholder|example|fixture|password123/i.test(value),
    )
  )
    fail('Replace placeholder secrets in the private configuration.');
  if (
    passwords[0] !== postgres.environment.POSTGRES_PASSWORD ||
    passwords[1] !== provision.environment.MIGRATION_PASSWORD ||
    passwords[2] !== provision.environment.RUNTIME_PASSWORD ||
    passwords[3] !== provision.environment.BACKUP_PASSWORD
  )
    fail('Provisioning passwords must match the corresponding private service credentials.');
  return {
    revision,
    project: 'clientops-staging',
    result: 'Configuration checks passed; no deployment or external acceptance performed.',
    pending: [
      'Owner security/risk and restricted-deployment approval',
      'Image labels, trusted TLS, firewall and proxy checks on the intended host',
      'Approved inbox receipt, off-host restore, alerts and human accessibility',
    ],
  };
}
