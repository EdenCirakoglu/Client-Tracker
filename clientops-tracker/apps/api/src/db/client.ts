import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import { env } from '../config/env';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  connectionTimeoutMillis: 2000,
  statement_timeout: 5000,
  query_timeout: 6000,
  idle_in_transaction_session_timeout: 10000,
});

// PostgreSQL outages must not terminate the process through an idle-client error.
pool.on('error', () => console.error('Database connection unavailable.'));

export const db = drizzle(pool);
