import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { grantRuntimeAccess } from './runtime-grants';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for migrations.');
const pool = new Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
});
try {
  await migrate(drizzle(pool), { migrationsFolder: './drizzle' });
  await grantRuntimeAccess(pool);
  console.log('Database migrations applied.');
} finally {
  await pool.end();
}
