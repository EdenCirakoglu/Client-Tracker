import assert from 'node:assert/strict';
import test from 'node:test';
import { assertHistoryScan, historyMounts } from '../lib/secret-scan.mjs';

test('secret scanner mounts worktree and shared Git metadata read-only', () => {
  const args = historyMounts('/workspace/review', '/workspace/.git');
  assert.ok(args.includes('/workspace/review:/repo:ro'));
  assert.ok(args.includes('/workspace/.git:/git-common:ro'));
  assert.ok(args.includes('GIT_DIR=/git-common'));
  assert.ok(args.includes('GIT_WORK_TREE=/repo'));
});

test('zero-commit, error, missing-summary and nonzero secret scans fail closed', () => {
  for (const [status, output] of [
    [0, 'INF 0 commits scanned.\nINF no leaks found'],
    [0, 'ERR git failed\nINF 20 commits scanned.'],
    [0, 'INF no leaks found'],
    [1, 'INF 20 commits scanned.'],
    [null, ''],
  ]) {
    assert.throws(() => assertHistoryScan(status, output), /did not complete/);
  }
  assert.doesNotThrow(() => assertHistoryScan(0, '\u001b[32mINF\u001b[0m 20 commits scanned.'));
});
