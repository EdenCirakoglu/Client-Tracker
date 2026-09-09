export function DataTable({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`min-w-0 overflow-hidden rounded-lg border border-border bg-white ${className}`}
    >
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Records table">
        <table className="min-w-full divide-y divide-border text-sm">{children}</table>
      </div>
    </div>
  );
}

export function Th({ children }: { children: React.ReactNode }) {
  return (
    <th
      scope="col"
      className="whitespace-nowrap px-4 py-3 text-left text-xs font-semibold uppercase text-muted"
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-4 py-3 align-top text-slate-700 ${className}`}>{children}</td>;
}
