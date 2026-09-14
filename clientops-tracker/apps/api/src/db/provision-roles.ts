import 'dotenv/config';
import { Pool } from 'pg';
import { applicationTables, grantRuntimeAccess } from './runtime-grants';

const connectionString = process.env.ADMIN_DATABASE_URL;
if (!connectionString || !process.env.DATABASE_ADMIN_CONFIRM)
  throw new Error(
    'ADMIN_DATABASE_URL and exact DATABASE_ADMIN_CONFIRM are required. Stop application services first.',
  );
const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 3000,
  statement_timeout: 10000,
});
const client = await pool.connect();
try {
  await client.query('BEGIN');
  await client.query("SELECT pg_advisory_xact_lock(hashtext('clientops-provision-roles'))");
  const {
    rows: [database],
  } = await client.query('SELECT current_database() AS name');
  if (database.name !== process.env.DATABASE_ADMIN_CONFIRM)
    throw new Error('Database confirmation mismatch.');
  for (const [role, password] of [
    ['clientops_migrator', process.env.MIGRATION_PASSWORD],
    ['clientops_runtime', process.env.RUNTIME_PASSWORD],
    ['clientops_backup', process.env.BACKUP_PASSWORD],
  ]) {
    if (!password || password.length < 32)
      throw new Error('Independent role passwords of at least 32 characters are required.');
    const exists = await client.query('SELECT 1 FROM pg_roles WHERE rolname=$1', [role]);
    if (!exists.rowCount) await client.query(`CREATE ROLE ${role} LOGIN`);
    const memberships = await client.query(
      'SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=$1)',
      [role],
    );
    if (memberships.rowCount)
      throw new Error('Application roles must have no inherited role memberships.');
    // PostgreSQL formats the identifier and literal; never print this statement or driver errors.
    const {
      rows: [statement],
    } = await client.query(
      "SELECT format('ALTER ROLE %I WITH LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS PASSWORD %L', $1::text, $2::text) AS sql",
      [role, password],
    );
    await client.query(statement.sql);
  }
  if (
    new Set([
      process.env.MIGRATION_PASSWORD,
      process.env.RUNTIME_PASSWORD,
      process.env.BACKUP_PASSWORD,
    ]).size !== 3
  )
    throw new Error('Use different role passwords.');
  const {
    rows: [databaseGrant],
  } = await client.query(
    "SELECT format('REVOKE ALL ON DATABASE %I FROM PUBLIC; GRANT CONNECT ON DATABASE %I TO clientops_runtime, clientops_migrator, clientops_backup; GRANT CREATE ON DATABASE %I TO clientops_migrator', current_database(), current_database(), current_database()) AS sql",
  );
  await client.query(databaseGrant.sql);
  for (const schema of ['public', 'drizzle']) {
    await client.query(`CREATE SCHEMA IF NOT EXISTS ${schema} AUTHORIZATION clientops_migrator`);
    await client.query(`ALTER SCHEMA ${schema} OWNER TO clientops_migrator`);
    await client.query(`REVOKE ALL ON SCHEMA ${schema} FROM PUBLIC`);
    const { rows: tables } = await client.query(
      'SELECT tablename FROM pg_tables WHERE schemaname=$1',
      [schema],
    );
    for (const { tablename } of tables) {
      if (
        !(applicationTables as readonly string[]).includes(tablename) &&
        !(schema === 'drizzle' && tablename === '__drizzle_migrations')
      )
        throw new Error(
          'Unexpected tables: this command is restricted to a dedicated ClientOps database.',
        );
      const {
        rows: [sql],
      } = await client.query(
        "SELECT format('ALTER TABLE %I.%I OWNER TO clientops_migrator', $1::text, $2::text) AS statement",
        [schema, tablename],
      );
      await client.query(sql.statement);
    }
    const { rows: enums } = await client.query(
      "SELECT t.typname FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=$1 AND t.typtype='e'",
      [schema],
    );
    for (const { typname } of enums) {
      const {
        rows: [sql],
      } = await client.query(
        "SELECT format('ALTER TYPE %I.%I OWNER TO clientops_migrator', $1::text, $2::text) AS statement",
        [schema, typname],
      );
      await client.query(sql.statement);
    }
  }
  await grantRuntimeAccess(client);
  await client.query('COMMIT');
  console.log('Dedicated migration and restricted runtime roles configured.');
} catch {
  await client.query('ROLLBACK');
  console.error(
    'Database role provisioning failed. Check the confirmation, dedicated schema and operator privileges. No credentials logged.',
  );
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
