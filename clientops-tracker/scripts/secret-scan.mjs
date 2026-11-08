import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { assertHistoryScan, historyMounts } from './lib/secret-scan.mjs';

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

const gitPath = (flag) =>
  resolve(root, execFileSync('git', ['rev-parse', flag], { cwd: root, encoding: 'utf8' }).trim());
const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

// Explicit read-only Git mounts also support linked worktrees with host-absolute .git paths.
const result = spawnSync(
  'docker',
  [
    'run',
    '--rm',
    ...historyMounts(root, gitPath('--git-common-dir')),
    '-e',
    'GIT_CONFIG_COUNT=1',
    '-e',
    'GIT_CONFIG_KEY_0=safe.directory',
    '-e',
    'GIT_CONFIG_VALUE_0=/repo',
    'ghcr.io/gitleaks/gitleaks@sha256:691af3c7c5a48b16f187ce3446d5f194838f91238f27270ed36eef6359a574d9',
    'git',
    '/repo',
    `--log-opts=--all ${head}`,
    '--redact=100',
    '--config=/repo/.gitleaks.toml',
  ],
  { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 },
);
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
if (result.error) throw result.error;
assertHistoryScan(result.status, `${result.stdout ?? ''}\n${result.stderr ?? ''}`);
