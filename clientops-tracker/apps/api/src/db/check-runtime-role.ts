import 'dotenv/config';
import { Pool } from 'pg';
import { assertRuntimeRole } from './runtime-grants';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 3000,
  query_timeout: 5000,
});
try {
  await assertRuntimeRole(pool);
  console.log('Restricted runtime role verified.');
} catch {
  console.error('Runtime identity is unavailable or too privileged.');
  process.exitCode = 1;
} finally {
  await pool.end();
}
