export const rollbackTargets = {
  '7eba339': {
    revision: '7eba339b37a2aa948ef4f6ed019d268816d4ec99',
    api: 'ghcr.io/edencirakoglu/client-tracker-api@sha256:f89b550bd3c3166ee4be56a9a8d6a64950f53b7482edc65394a313ca66e512df',
    web: 'ghcr.io/edencirakoglu/client-tracker-web@sha256:780012866bcf3ac9a3155290ff3d3ad7ab14019c7b22d851629f90eddaf2cb39',
    accountPause: false,
  },
  bdc749: {
    revision: 'bdc749421187c017f4cc3ba36b2b9ef1d09fda80',
    api: 'ghcr.io/edencirakoglu/client-tracker-api@sha256:c3e3c6e4e0d0166e54c734f29bd9270ba4fdaa8a4649ed052b1539a12da36e83',
    web: 'ghcr.io/edencirakoglu/client-tracker-web@sha256:1d81853b12c29c73ac402160d6fff05d76a4fd71fbb84434730587a178059f79',
    accountPause: true,
  },
};

export function planRollback(original, target, nginx, acknowledge) {
  const release = rollbackTargets[target];
  if (!release)
    throw new Error('Only explicitly verified session-era releases can be rollback targets.');
  if (release.accountPause && !acknowledge)
    throw new Error('Explicitly acknowledge suspended account delivery for this older release.');
  if (original.services.api.ports?.length)
    throw new Error('API must be private behind the rollback gateway.');
  const config = structuredClone(original);
  for (const service of ['api', 'web']) {
    config.services[service].image = release[service];
    delete config.services[service].build;
  }
  for (const service of ['mail-worker', 'worker'])
    if (config.services[service]) config.services[service].scale = 0;
  config.services.api.healthcheck.test = [
    'CMD',
    'node',
    '-e',
    `fetch('http://127.0.0.1:8080/health${release.accountPause ? '' : '/ready'}',{signal:AbortSignal.timeout(2500)}).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))`,
  ];
  if (release.accountPause) {
    if (!nginx.includes('location /api/ {')) throw new Error('Unrecognised gateway configuration.');
    nginx = nginx.replace(
      'location /api/ {',
      `location ~* ^/api/(auth/(forgot-password|reset-password|accept-invitation|change-password)|users)(/|$) {
        default_type application/json;
        return 503 '{"error":{"code":"MAINTENANCE","message":"Account changes are temporarily unavailable."}}';
    }
    location = /api/health/ready {
        default_type application/json;
        return 503 '{"error":{"code":"READINESS_UNAVAILABLE","message":"Legacy rollback has no database readiness probe."}}';
    }
    location /api/ {`,
    );
  }
  return { config, nginx, release };
}
