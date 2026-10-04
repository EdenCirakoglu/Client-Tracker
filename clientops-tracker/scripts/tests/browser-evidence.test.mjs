import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { validateBrowserEvidence } from '../check-browser-evidence.mjs';

const revision = 'a'.repeat(40);
const report = () => ({
  config: { metadata: { revision, workingTreeDirty: false } },
  stats: { expected: 1, unexpected: 0 },
  suites: [{}],
});
test('missing browser report fails the upload gate', () => {
  assert.throws(() =>
    execFileSync(
      process.execPath,
      ['scripts/check-browser-evidence.mjs', 'test-results/nonexistent-browser-report.json'],
      { stdio: 'pipe' },
    ),
  );
});
test('valid passing and failing reports retain exact revision provenance', () => {
  validateBrowserEvidence(JSON.stringify(report()), revision, true);
  const failed = report();
  failed.stats = { expected: 0, unexpected: 1 };
  validateBrowserEvidence(JSON.stringify(failed), revision, true);
});

test('decoded nested Windows paths are rejected in hosted artifacts', () => {
  for (const path of ['C:\\Users\\Fixture\\project', 'C:/Users/Fixture/project']) {
    const text = JSON.stringify({ ...report(), errors: [{ stack: path }] });
    assert.throws(() => validateBrowserEvidence(text, revision, true), /personal Windows path/);
  }
});
test('stale, dirty, empty, malformed and private browser reports are rejected', () => {
  assert.throws(() => validateBrowserEvidence('{}', revision, true));
  assert.throws(() => validateBrowserEvidence(JSON.stringify(report()), 'b'.repeat(40), true));
  const dirty = report();
  dirty.config.metadata.workingTreeDirty = true;
  assert.throws(() => validateBrowserEvidence(JSON.stringify(dirty), revision, true));
  const empty = report();
  empty.stats.expected = 0;
  assert.throws(() => validateBrowserEvidence(JSON.stringify(empty), revision, true));
  for (const secret of ['clientops.sid=' + 's%3Afixture', '#token=' + 'c'.repeat(64)]) {
    assert.throws(() =>
      validateBrowserEvidence(JSON.stringify({ ...report(), error: secret }), revision, true),
    );
  }
});
