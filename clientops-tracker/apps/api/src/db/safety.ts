export function databaseName(url: string) {
  const parsed = new URL(url);
  if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
    throw new Error('A PostgreSQL connection URL is required.');
  }
  return decodeURIComponent(parsed.pathname.slice(1));
}

export function assertDisposableDatabase(
  url: string,
  designatedName: string | undefined,
  purpose: 'test' | 'seed',
) {
  const name = databaseName(url);
  const allowed =
    purpose === 'test' ? /^clientops_[a-z0-9_]*test$/ : /^clientops_[a-z0-9_]*(demo|test)$/;
  if (!designatedName || name !== designatedName || !allowed.test(name)) {
    throw new Error(
      `Refusing ${purpose}: explicitly set DISPOSABLE_DATABASE_NAME to a dedicated clientops_*${purpose === 'test' ? 'test' : 'demo or clientops_*test'} database. Development and production databases must not be used.`,
    );
  }
}

export function requireTestDatabase(configuration: NodeJS.ProcessEnv) {
  const url = configuration.TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      'TEST_DATABASE_URL is required. Tests never fall back to DATABASE_URL or .env.',
    );
  assertDisposableDatabase(url, configuration.DISPOSABLE_DATABASE_NAME, 'test');
  return url;
}
