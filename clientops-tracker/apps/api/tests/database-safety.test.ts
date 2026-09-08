import { describe, expect, it } from 'vitest';
import { assertDisposableDatabase, requireTestDatabase } from '../src/db/safety';

describe('Disposable database safety', () => {
  it('never uses DATABASE_URL as a test fallback', () => {
    expect(() =>
      requireTestDatabase({ DATABASE_URL: 'postgresql://localhost/clientops_demo' }),
    ).toThrow('TEST_DATABASE_URL');
  });
  it.each(['clientops_demo', 'clientops_tracker', 'production', 'clientops_production'])(
    'refuses test execution against %s',
    (name) => {
      expect(() =>
        requireTestDatabase({
          TEST_DATABASE_URL: `postgresql://localhost/${name}`,
          DISPOSABLE_DATABASE_NAME: name,
        }),
      ).toThrow('Refusing test');
    },
  );
  it('requires the exact explicit disposable designation', () => {
    expect(() =>
      requireTestDatabase({ TEST_DATABASE_URL: 'postgresql://localhost/clientops_test' }),
    ).toThrow();
    expect(() =>
      assertDisposableDatabase('postgresql://localhost/clientops_demo', 'clientops_test', 'seed'),
    ).toThrow();
  });
  it('accepts an explicitly designated test database', () => {
    const url = 'postgresql://localhost/clientops_test';
    expect(
      requireTestDatabase({ TEST_DATABASE_URL: url, DISPOSABLE_DATABASE_NAME: 'clientops_test' }),
    ).toBe(url);
  });
  it('refuses reset of the original development database', () => {
    expect(() =>
      assertDisposableDatabase(
        'postgresql://localhost/clientops_tracker',
        'clientops_tracker',
        'seed',
      ),
    ).toThrow();
  });
});
