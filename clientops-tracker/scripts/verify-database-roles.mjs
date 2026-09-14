import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { compose, database, project, query } from './lib/ops-fixture.mjs';

compose(['exec', '-T', 'api', 'node', 'dist/check-runtime-role.js']);
assert.throws(
  () =>
    compose([
      'run',
      '--rm',
      '--no-deps',
      '-e',
      `DATABASE_URL=postgresql://hardening:local_disposable_database_password@postgres:5432/${database}`,
      'api',
      'node',
      'dist/check-runtime-role.js',
    ]),
  'Privileged owner must fail the same guard used by production startup',
);

const result = compose([
  'exec',
  '-T',
  'api',
  'node',
  '--input-type=module',
  '-e',
  `
import { Pool } from 'pg';
const pool = new Pool({connectionString:process.env.DATABASE_URL});
const c=await pool.connect();
const denied=[];
try {
  const role=(await c.query('SELECT current_user AS name')).rows[0].name;
  if(role!=='clientops_runtime') throw new Error('Runtime did not use the restricted role');
  for(const sql of ['CREATE TABLE privilege_probe(id int)', 'TRUNCATE tickets', 'DELETE FROM clients WHERE false', 'UPDATE ticket_events SET event_type=event_type WHERE false', 'UPDATE bootstrap_state SET id=id WHERE false', 'SET ROLE clientops_migrator']) {
    await c.query('BEGIN');
    let code;
    try { await c.query(sql); } catch(error) {code=error.code;}
    finally {await c.query('ROLLBACK');}
    if(code!=='42501') throw new Error('A forbidden operation was not denied');
    denied.push(sql.split(' ')[0]);
  }
  console.log(JSON.stringify({role, denied}));
} finally {c.release();await pool.end();}
`,
]);
const checked = JSON.parse(result);
assert.equal(checked.denied.length, 6);
assert.equal(
  query(
    "SELECT has_table_privilege('clientops_backup','tickets','SELECT') AND NOT has_table_privilege('clientops_backup','tickets','UPDATE')",
  ),
  't',
);
assert.equal(
  query(
    "SELECT has_schema_privilege('clientops_migrator','public','CREATE') AND NOT has_schema_privilege('clientops_runtime','public','CREATE')",
  ),
  't',
);
writeFileSync(
  'test-results/database-roles.json',
  JSON.stringify(
    {
      revision: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      project,
      database,
      ...checked,
      backupReadOnly: true,
      migrationOwnerSeparate: true,
      checkedAt: new Date().toISOString(),
    },
    null,
    2,
  ),
);
console.log(
  'Runtime DDL, truncation, business/history deletion and privilege escalation denied; backup role read-only.',
);
