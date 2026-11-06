import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';

const api = resolve('apps/api');
const require = createRequire(join(api, 'package.json'));
const kit = join(dirname(require.resolve('drizzle-kit')), 'bin.cjs');
const temp = mkdtempSync(join(tmpdir(), 'clientops-migration-check-'));
const out = join(temp, 'drizzle');
const files = (directory) =>
  readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1))
    .sort();
try {
  cpSync(join(api, 'drizzle'), out, { recursive: true });
  const before = files(out).map((file) => [file, readFileSync(join(out, file), 'utf8')]);
  const output = execFileSync(
    process.execPath,
    [
      kit,
      'generate',
      '--dialect=postgresql',
      '--schema=./src/db/schema.ts',
      `--out=${relative(api, out).replaceAll('\\', '/')}`,
    ],
    { cwd: api, encoding: 'utf8', timeout: 60000 },
  );
  // Kit can report some errors without a failing exit code. Require its success result too.
  assert.match(output, /No schema changes, nothing to migrate/);
  assert.deepEqual(
    files(out).map((file) => [file, readFileSync(join(out, file), 'utf8')]),
    before,
    'Dependency upgrade must not generate or rewrite migrations or snapshots.',
  );
  console.log('Migration generation unchanged; historical files were checked in a temporary copy.');
} finally {
  assert.equal(dirname(resolve(temp)), resolve(tmpdir()));
  rmSync(temp, { recursive: true, force: true });
}
