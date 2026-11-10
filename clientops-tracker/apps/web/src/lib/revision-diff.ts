import { diffWordsWithSpace, type Change } from 'diff';

export interface RevisionField {
  label: string;
  previous: string | null;
  proposed: string | null;
}

export function revisionChanges(previous: string, proposed: string): Change[] {
  // Bound work for unusually large or dissimilar historical records.
  const changes =
    previous.length + proposed.length <= 16000
      ? diffWordsWithSpace(previous, proposed, { maxEditLength: 800, timeout: 40 })
      : undefined;
  return (
    changes ?? [
      { value: previous, removed: true, added: false, count: 1 },
      { value: proposed, removed: false, added: true, count: 1 },
    ]
  );
}

export function comparisonSelection(
  search: string,
  revisions: number[],
): { from: number; to: number } {
  const ordered = [...revisions].sort((a, b) => a - b);
  const latest = ordered.at(-1) ?? 0;
  const params = new URLSearchParams(search);
  const number = (key: string) => {
    const value = params.get(key);
    return value && /^(0|[1-9]\d{0,2})$/.test(value) ? Number(value) : -1;
  };
  const to = ordered.includes(number('to')) ? number('to') : latest;
  const scopeRevisions = ordered.filter((revision) => revision > 0 && revision < to);
  const before = scopeRevisions.length
    ? scopeRevisions
    : ordered.filter((revision) => revision < to);
  return { from: before.includes(number('from')) ? number('from') : (before.at(-1) ?? to), to };
}
