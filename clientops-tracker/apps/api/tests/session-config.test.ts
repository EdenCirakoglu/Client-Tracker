import { randomBytes } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('Production session configuration', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('APP_ORIGIN', 'https://portal.example');
    vi.stubEnv('API_ORIGIN', 'https://portal.example');
    vi.stubEnv('SESSION_SECRET', randomBytes(32).toString('hex'));
    vi.stubEnv('DEMO_MODE', 'false');
    vi.stubEnv('SMTP_MODE', 'capture');
    vi.stubEnv('SMTP_HOST', 'localhost');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });
  it('rejects the copied production example secret', async () => {
    vi.stubEnv('SESSION_SECRET', 'replace_with_a_long_random_secret_at_least_32_characters');
    await expect(import('../src/config/env')).rejects.toThrow('real SESSION_SECRET');
  });
  it('rejects HTTP even with a random secret', async () => {
    vi.stubEnv('APP_ORIGIN', 'http://portal.example');
    await expect(import('../src/config/env')).rejects.toThrow('HTTPS origins');
  });
  it('accepts an explicit random secret and HTTPS without connecting to email or databases', async () => {
    const { env } = await import('../src/config/env');
    expect(env.APP_ORIGIN).toBe('https://portal.example');
    expect(env.DEMO_MODE).toBe(false);
  });
});
