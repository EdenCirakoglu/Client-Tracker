'use client';

import { useId, useMemo, useState } from 'react';
import { AlignLeft, Columns2 } from 'lucide-react';
import { revisionChanges, type RevisionField } from '../../lib/revision-diff';
import { Button } from '../ui/button';

interface RevisionComparisonProps {
  previousRevision: number;
  currentRevision: number;
  fields: RevisionField[];
}
export function RevisionComparison({
  previousRevision,
  currentRevision,
  fields,
}: RevisionComparisonProps) {
  const id = useId();
  const [inline, setInline] = useState(false);
  const [changesOnly, setChangesOnly] = useState(true);
  const rows = useMemo(
    () =>
      fields.map((field) => ({
        ...field,
        changed: (field.previous ?? '') !== (field.proposed ?? ''),
        changes: revisionChanges(field.previous ?? '', field.proposed ?? ''),
      })),
    [fields],
  );
  const unchanged = rows.filter((field) => !field.changed);
  return (
    <section className="meridian-comparison" aria-label="Revision comparison">
      <div className="diff-heading">
        <div>
          <h3 className="text-base font-semibold">What changed in revision {currentRevision}</h3>
          <p className="meridian-meta mt-1 text-muted">
            R{previousRevision} to R{currentRevision}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex gap-1" role="group" aria-label="Comparison layout">
            <Button
              type="button"
              variant="secondary"
              aria-pressed={!inline}
              onClick={() => setInline(false)}
              title="Side-by-side comparison"
            >
              <Columns2 size={16} />
              <span className="sr-only">Side by side</span>
            </Button>
            <Button
              type="button"
              variant="secondary"
              aria-pressed={inline}
              onClick={() => setInline(true)}
              title="Inline comparison"
            >
              <AlignLeft size={16} />
              <span className="sr-only">Inline</span>
            </Button>
          </div>
          <label htmlFor={id + '-changes'} className="flex min-h-11 items-center gap-2 text-xs">
            <input
              id={id + '-changes'}
              type="checkbox"
              checked={changesOnly}
              onChange={(event) => setChangesOnly(event.target.checked)}
            />{' '}
            Changes only
          </label>
        </div>
      </div>
      <div className="diff-legend" aria-label="Diff legend">
        <span className="diff-added">Added</span>
        <span className="diff-removed">Removed</span>
        <span>Unchanged</span>
      </div>
      <table className={'diff-table ' + (inline ? 'diff-inline' : '')} role="table">
        <caption className="sr-only">
          Fields, revision {previousRevision} compared with revision {currentRevision}
        </caption>
        <thead className="sr-only">
          <tr role="row">
            <th scope="col">Field</th>
            <th scope="col">{inline ? 'Changes' : 'Previous revision ' + previousRevision}</th>
            {!inline ? <th scope="col">This revision {currentRevision}</th> : null}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((field) => !changesOnly || field.changed)
            .map((field) => (
              <tr key={field.label} role="row">
                <th scope="row" role="rowheader">
                  {field.label}
                  <span className="diff-field-state">
                    {!field.changed
                      ? 'Unchanged'
                      : !field.previous
                        ? 'Added'
                        : !field.proposed
                          ? 'Removed'
                          : 'Changed'}
                  </span>
                </th>
                {(inline ? (['inline'] as const) : (['previous', 'proposed'] as const)).map(
                  (side) => (
                    <td role="cell" key={side}>
                      <span className="diff-column-label">
                        {side === 'previous'
                          ? 'R' + previousRevision + ' - previous'
                          : side === 'proposed'
                            ? 'R' + currentRevision + ' - this revision'
                            : 'Removed / added'}
                      </span>
                      <p className="whitespace-pre-wrap">
                        {field.changes
                          .filter(
                            (change) =>
                              side === 'inline' ||
                              (side === 'previous' ? !change.added : !change.removed),
                          )
                          .map((change, index) =>
                            change.added ? (
                              <ins key={index}>
                                <span className="sr-only">Added: </span>
                                {change.value}
                                <span className="sr-only">; </span>
                              </ins>
                            ) : change.removed ? (
                              <del key={index}>
                                <span className="sr-only">Removed: </span>
                                {change.value}
                                <span className="sr-only">; </span>
                              </del>
                            ) : (
                              <span key={index}>{change.value}</span>
                            ),
                          )}
                        {side === 'previous' && !field.previous ? (
                          <span className="text-muted">Not recorded</span>
                        ) : null}
                        {side === 'proposed' && !field.proposed ? (
                          <span className="text-muted">No value in this revision</span>
                        ) : null}
                      </p>
                    </td>
                  ),
                )}
              </tr>
            ))}
        </tbody>
      </table>
      {!rows.some((field) => field.changed) ? (
        <p className="px-5 py-3 text-sm text-muted">No changes to these fields.</p>
      ) : null}
      {unchanged.length && changesOnly ? (
        <details className="diff-unchanged">
          <summary>Unchanged: {unchanged.map((field) => field.label).join(', ')}</summary>
          <dl className="mt-3 space-y-3">
            {unchanged.map((field) => (
              <div key={field.label}>
                <dt className="font-semibold">{field.label}</dt>
                <dd className="mt-1 whitespace-pre-wrap text-muted">
                  {field.proposed || 'Not recorded'}
                </dd>
              </div>
            ))}
          </dl>
        </details>
      ) : null}
    </section>
  );
}
