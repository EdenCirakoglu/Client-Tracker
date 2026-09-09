import 'dotenv/config';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tables = [
  'clients',
  'users',
  'projects',
  'tickets',
  'ticket_comments',
  'ticket_events',
  'releases',
  'triage_suggestions',
];
const connection = await pool.connect();
try {
  await connection.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  const hash = createHash('sha256');
  const counts: Record<string, number> = {};
  for (const table of tables) {
    // Identifiers come only from the fixed table allowlist above.
    const result = await connection.query(
      `SELECT to_jsonb(t) AS record FROM "${table}" t ORDER BY id`,
    );
    hash.update(table + JSON.stringify(result.rows));
    counts[table] = result.rowCount ?? 0;
  }
  await connection.query('COMMIT');
  console.log(JSON.stringify({ sha256: hash.digest('hex'), counts }));
} finally {
  connection.release();
  await pool.end();
}
