interface RevisionField {
  label: string;
  previous: string | null;
  proposed: string | null;
}
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
  const changed = fields.filter((field) => (field.previous ?? '') !== (field.proposed ?? ''));
  const unchanged = fields.filter((field) => (field.previous ?? '') === (field.proposed ?? ''));
  return (
    <section className="journal-comparison" aria-label="Revision comparison">
      <h3 className="text-base font-semibold">What changed in revision {currentRevision}</h3>
      <p className="mt-1 text-xs text-muted">
        Compared with revision {previousRevision}. Earlier decisions remain in the history; they do
        not approve this revision.
      </p>
      <dl className="mt-3 divide-y divide-border">
        {changed.map((field) => (
          <div key={field.label} className="py-3">
            <dt className="flex flex-wrap items-center gap-2 text-sm font-semibold">
              {field.label}
              <span className="status-badge status-info rounded px-2 py-0.5 text-xs">
                {!field.previous ? 'Added' : !field.proposed ? 'Removed' : 'Changed'}
              </span>
            </dt>
            <dd className="mt-2 grid gap-3 text-sm sm:grid-cols-2">
              <div className="min-w-0">
                <span className="text-xs text-muted">Previous revision {previousRevision}</span>
                <p className="mt-1 whitespace-pre-wrap">{field.previous || 'Not recorded'}</p>
              </div>
              <div className="min-w-0 border-l-2 border-brand-600 pl-3">
                <span className="text-xs font-semibold text-brand-700">
                  This revision {currentRevision}
                </span>
                <p className="mt-1 whitespace-pre-wrap">
                  {field.proposed || 'Removed; no value proposed'}
                </p>
              </div>
            </dd>
          </div>
        ))}
      </dl>
      {!changed.length ? (
        <p className="mt-3 text-sm text-muted">No changes to these fields.</p>
      ) : null}
      {unchanged.length ? (
        <p className="mt-2 text-xs text-muted">
          Unchanged: {unchanged.map((field) => field.label).join(', ')}.
        </p>
      ) : null}
    </section>
  );
}
