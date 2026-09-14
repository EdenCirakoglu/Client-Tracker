import 'dotenv/config';
import { Pool } from 'pg';
import { databaseName } from './safety';

const url = process.env.DATABASE_URL;
if (
  !url ||
  process.env.RESTORE_CONFIRM_DATABASE !== databaseName(url) ||
  process.env.RESTORE_OFFLINE !== 'true'
)
  throw new Error(
    'Restore sanitisation requires the exact RESTORE_CONFIRM_DATABASE and RESTORE_OFFLINE=true.',
  );

const pool = new Pool({ connectionString: url, max: 1, connectionTimeoutMillis: 3000 });
const connection = await pool.connect();
try {
  await connection.query('BEGIN');
  await connection.query("SET LOCAL lock_timeout = '3s'");
  await connection.query("SET LOCAL statement_timeout = '30s'");
  const others = await connection.query(`SELECT count(*)::int AS count FROM pg_stat_activity
    WHERE datname = current_database() AND pid <> pg_backend_pid() AND backend_type = 'client backend'`);
  if (others.rows[0].count !== 0)
    throw new Error(
      'Stop API, mail workers, Studio and all other database clients before sanitising.',
    );
  // Run before exposing a restored database. Application access must remain blocked throughout.
  await connection.query(
    'LOCK TABLE users, web_sessions, auth_sessions, account_tokens, mail_outbox, auth_rate_limits IN ACCESS EXCLUSIVE MODE',
  );
  await connection.query('DELETE FROM mail_outbox');
  await connection.query('DELETE FROM account_tokens');
  await connection.query('DELETE FROM auth_sessions');
  await connection.query('DELETE FROM web_sessions');
  await connection.query('DELETE FROM auth_rate_limits');
  await connection.query('UPDATE users SET auth_version = auth_version + 1');
  await connection.query('COMMIT');
  console.log(
    'Restored sessions, account links and queued mail invalidated. Business data retained.',
  );
} catch (error) {
  await connection.query('ROLLBACK');
  throw error;
} finally {
  connection.release();
  await pool.end();
}
