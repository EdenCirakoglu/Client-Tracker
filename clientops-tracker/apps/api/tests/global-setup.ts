import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { requireTestDatabase } from '../src/db/safety';

export default async function setup() {
  const pool = new Pool({
    connectionString: requireTestDatabase(process.env),
    connectionTimeoutMillis: 2000,
    query_timeout: 6000,
  });
  try {
    try {
      await pool.query('SELECT 1');
    } catch (cause) {
      throw new Error(
        'Disposable test database unavailable. Run pnpm db:test:up from the workspace root and align apps/api/.env.test with .env.test.example (default PostgreSQL port 55434). Tests never use the development database.',
        { cause },
      );
    }
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }
}
