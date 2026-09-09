import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { requireTestDatabase } from '../src/db/safety';

export default async function setup() {
  const pool = new Pool({ connectionString: requireTestDatabase(process.env) });
  try {
    await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  } finally {
    await pool.end();
  }
}
