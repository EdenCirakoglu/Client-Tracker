import 'dotenv/config';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 1,
  connectionTimeoutMillis: 3000,
  query_timeout: 5000,
  statement_timeout: 4500,
});
try {
  // Fixed-size batches keep routine retention work from monopolising the database.
  const statements = [
    `DELETE FROM mail_outbox WHERE id IN (SELECT id FROM mail_outbox WHERE completed_at < now() - interval '30 days' AND status IN ('DELIVERED','FAILED','EXPIRED') LIMIT 500)`,
    `DELETE FROM account_tokens WHERE id IN (SELECT id FROM account_tokens WHERE expires_at < now() - interval '30 days' LIMIT 500)`,
    `DELETE FROM auth_sessions WHERE sid_hash IN (SELECT sid_hash FROM auth_sessions WHERE absolute_expires_at < now() - interval '30 days' LIMIT 500)`,
    `DELETE FROM web_sessions WHERE sid IN (SELECT sid FROM web_sessions WHERE expire < now() LIMIT 500)`,
    `DELETE FROM auth_rate_limits WHERE key IN (SELECT key FROM auth_rate_limits WHERE expire < extract(epoch FROM now()) * 1000 LIMIT 500)`,
  ];
  for (const statement of statements) await pool.query(statement);
  console.log('Bounded operational retention batch completed.');
} finally {
  await pool.end();
}
