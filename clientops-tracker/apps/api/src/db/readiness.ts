import { Pool } from 'pg';
import { env } from '../config/env';

// Independent small pool: a saturated request pool cannot starve the readiness probe.
export const readinessPool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 2,
  connectionTimeoutMillis: 750,
  query_timeout: 750,
  statement_timeout: 750,
  idleTimeoutMillis: 1000,
  allowExitOnIdle: true,
});
readinessPool.on('error', () => {});

export async function databaseReady(): Promise<boolean> {
  try {
    await readinessPool.query('SELECT 1 FROM users LIMIT 1');
    return true;
  } catch {
    return false;
  }
}

export function databaseUnavailable(error: unknown, depth = 0): boolean {
  if (!error || typeof error !== 'object' || depth > 4) return false;
  const value = error as { code?: string; message?: string; cause?: unknown };
  return (
    /^(08\w{3}|57P0[123]|53300|57014|ECONNREFUSED|ECONNRESET|ETIMEDOUT|EPIPE|ENOTFOUND|EAI_AGAIN)$/.test(
      value.code ?? '',
    ) ||
    /^(Connection terminated|Connection terminated unexpectedly|Connection terminated due to connection timeout|Query read timeout|timeout exceeded when trying to connect)$/.test(
      value.message ?? '',
    ) ||
    databaseUnavailable(value.cause, depth + 1)
  );
}
