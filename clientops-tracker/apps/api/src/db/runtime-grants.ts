import type { PoolClient, Pool } from 'pg';

export const applicationTables = [
  'clients',
  'users',
  'projects',
  'tickets',
  'ticket_comments',
  'ticket_events',
  'releases',
  'triage_suggestions',
  'web_sessions',
  'auth_sessions',
  'account_tokens',
  'auth_rate_limits',
  'bootstrap_state',
  'mail_outbox',
] as const;

export async function grantRuntimeAccess(client: PoolClient | Pool) {
  const role = await client.query("SELECT 1 FROM pg_roles WHERE rolname='clientops_runtime'");
  if (!role.rowCount) return; // Existing development/test databases need no new cluster roles.
  await client.query('REVOKE ALL ON SCHEMA public FROM PUBLIC');
  await client.query('REVOKE ALL ON SCHEMA public FROM clientops_runtime');
  await client.query('GRANT USAGE ON SCHEMA public TO clientops_runtime');
  await client.query('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM clientops_runtime, PUBLIC');
  for (const table of applicationTables) {
    const exists = await client.query('SELECT to_regclass($1) AS name', [`public.${table}`]);
    if (!exists.rows[0].name) continue;
    const operations =
      table === 'bootstrap_state'
        ? 'SELECT'
        : table === 'ticket_events'
          ? 'SELECT, INSERT'
          : [
                'web_sessions',
                'auth_sessions',
                'account_tokens',
                'auth_rate_limits',
                'mail_outbox',
              ].includes(table)
            ? 'SELECT, INSERT, UPDATE, DELETE'
            : 'SELECT, INSERT, UPDATE';
    await client.query(`GRANT ${operations} ON public.${table} TO clientops_runtime`);
  }
  if ((await client.query("SELECT 1 FROM pg_roles WHERE rolname='clientops_backup'")).rowCount) {
    await client.query('REVOKE ALL ON SCHEMA public, drizzle FROM clientops_backup');
    await client.query('REVOKE ALL ON ALL TABLES IN SCHEMA public, drizzle FROM clientops_backup');
    await client.query(
      'REVOKE ALL ON ALL SEQUENCES IN SCHEMA public, drizzle FROM clientops_backup',
    );
    await client.query('GRANT USAGE ON SCHEMA public, drizzle TO clientops_backup');
    await client.query('GRANT SELECT ON ALL TABLES IN SCHEMA public, drizzle TO clientops_backup');
    await client.query(
      'GRANT SELECT ON ALL SEQUENCES IN SCHEMA public, drizzle TO clientops_backup',
    );
  }
}

export async function assertRuntimeRole(client: Pool | PoolClient) {
  const {
    rows: [role],
  } = await client.query(`SELECT current_user AS name,
    rolsuper OR rolcreatedb OR rolcreaterole OR rolreplication OR rolbypassrls AS elevated,
    has_schema_privilege(current_user, 'public', 'CREATE') AS ddl,
    has_database_privilege(current_user, current_database(), 'CREATE') AS create_schema,
    EXISTS (SELECT 1 FROM pg_auth_members WHERE member=(SELECT oid FROM pg_roles WHERE rolname=current_user)) AS member
    FROM pg_roles WHERE rolname=current_user`);
  if (
    !role ||
    role.name !== 'clientops_runtime' ||
    role.elevated ||
    role.ddl ||
    role.create_schema ||
    role.member
  )
    throw new Error('Production requires the restricted clientops_runtime database role.');
}
