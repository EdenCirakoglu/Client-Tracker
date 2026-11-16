import assert from 'node:assert/strict';
import { test } from 'node:test';
import { comparisonSelection, revisionChanges } from '../../apps/web/src/lib/revision-diff.ts';

test('word changes preserve both complete source texts and punctuation', () => {
  const previous = 'Find active shipments by customer reference.\nEstimate: one day.';
  const proposed = 'Find active and archived shipments by customer reference.\nEstimate: two days.';
  const changes = revisionChanges(previous, proposed);
  assert.equal(
    changes
      .filter((p) => !p.added)
      .map((p) => p.value)
      .join(''),
    previous,
  );
  assert.equal(
    changes
      .filter((p) => !p.removed)
      .map((p) => p.value)
      .join(''),
    proposed,
  );
  assert.ok(changes.some((p) => p.added && p.value.includes('archived')));
});
test('whitespace, removal, non-Latin text and markup remain literal data', () => {
  for (const [before, after] of [
    ['  line\n', ' line\n\n'],
    ['removed', ''],
    ['Merhaba', 'Merhaba dunya'],
    ['<script>alert(1)</script>', '<b>not HTML</b>'],
  ]) {
    const changes = revisionChanges(before, after);
    assert.equal(
      changes
        .filter((p) => !p.added)
        .map((p) => p.value)
        .join(''),
      before,
    );
    assert.equal(
      changes
        .filter((p) => !p.removed)
        .map((p) => p.value)
        .join(''),
      after,
    );
  }
});
test('bounded fallback retains entire long records instead of truncating evidence', () => {
  const previous = 'before '.repeat(3000);
  const proposed = 'after '.repeat(3000);
  const changes = revisionChanges(previous, proposed);
  assert.equal(changes.length, 2);
  assert.equal(changes[0].value, previous);
  assert.equal(changes[1].value, proposed);
});
test('comparison URLs only select stored revisions in chronological order', () => {
  assert.deepEqual(comparisonSelection('?from=0&to=2', [2, 1, 0]), { from: 1, to: 2 });
  assert.deepEqual(comparisonSelection('', [3, 2, 1, 0]), { from: 2, to: 3 });
  assert.deepEqual(comparisonSelection('?from=1&to=3', [3, 2, 1, 0]), { from: 1, to: 3 });
  assert.deepEqual(comparisonSelection('?from=3&to=1', [3, 2, 1, 0]), { from: 0, to: 1 });
  assert.deepEqual(comparisonSelection('?to=0', [2, 1, 0]), { from: 0, to: 0 });
  for (const value of ['-1', '2.5', '03', 'Infinity', '99', 'javascript:alert(1)']) {
    assert.deepEqual(comparisonSelection(`?to=${value}&from=${value}`, [2, 1]), { from: 1, to: 2 });
  }
  assert.deepEqual(comparisonSelection('?from=0&to=0', [1]), { from: 1, to: 1 });
});
