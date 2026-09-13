import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' })
  .split('\0')
  .filter(Boolean);
const invalid = files.filter(
  (file) =>
    file.endsWith('.md') &&
    /[A-Z]:[\\/]Users[\\/][^\s]+/i.test(readFileSync(resolve(root, file), 'utf8')),
);
if (invalid.length) throw new Error(`Use portable paths in: ${invalid.join(', ')}`);

// Pinned Gitleaks 8.30.0. The full checkout history and fixtures are scanned, not excluded.
execFileSync(
  'docker',
  [
    'run',
    '--rm',
    '-v',
    `${root}:/repo:ro`,
    '-e',
    'GIT_CONFIG_COUNT=1',
    '-e',
    'GIT_CONFIG_KEY_0=safe.directory',
    '-e',
    'GIT_CONFIG_VALUE_0=/repo',
    'ghcr.io/gitleaks/gitleaks@sha256:691af3c7c5a48b16f187ce3446d5f194838f91238f27270ed36eef6359a574d9',
    'git',
    '/repo',
    '--log-opts=--all',
    '--redact=100',
    '--config=/repo/.gitleaks.toml',
  ],
  { stdio: 'inherit' },
);
