'use client';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatHours, titleCase } from '../../lib/format';
import { useApiData } from '../../lib/use-api-data';
import { ErrorState, LoadingState } from '../ui/states';
import { MetricCards } from './metric-cards';

export function DashboardSnapshot({ refresh }: { refresh: number }) {
  const { user } = useAuth();
  const { data, error, loading, reload } = useApiData(api.dashboardMetrics, [refresh]);
  return (
    <section className="portal-section" aria-labelledby="snapshot-heading">
      <h2 id="snapshot-heading" className="portal-section-title">
        {user?.role === 'CLIENT' ? 'Organisation snapshot' : 'Team snapshot'}
      </h2>
      {loading ? (
        <LoadingState label="Loading overview..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <p className="mb-4 mt-2 break-words text-xs text-muted">
            {data.scope} &middot; Updated{' '}
            <time dateTime={data.generatedAt}>
              {new Date(data.generatedAt).toLocaleTimeString(undefined, {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </time>
          </p>
          <MetricCards metrics={data} client={user?.role === 'CLIENT'} />
          <details className="mt-4 border-t border-border pt-2">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
              Ticket breakdown
            </summary>
            <div className="space-y-6 pb-4">
              <Distribution
                title="Tickets by status"
                values={data.ticketsByStatus.map((item) => ({
                  label: item.status,
                  count: item.count,
                }))}
              />
              <Distribution
                title="Tickets by priority"
                values={data.ticketsByPriority.map((item) => ({
                  label: item.priority,
                  count: item.count,
                }))}
              />
              <div>
                <h3 className="text-sm font-semibold">Resolution time</h3>
                <p className="mt-2 text-lg tabular-nums">
                  {formatHours(data.averageResolutionTimeHours)}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Mean creation-to-recorded-resolution time across this scope. Reopened tickets
                  retain their first resolution timestamp; this is not a lifecycle performance
                  measure.
                </p>
              </div>
            </div>
          </details>
          {user?.role !== 'CLIENT' && data.developerWorkload ? (
            <details className="border-t border-border pt-2">
              <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
                Developer workload
              </summary>
              <p className="text-xs text-muted">
                Team assignments &middot; unresolved now &middot; up to 10 developers
              </p>
              <ul className="mt-2 divide-y divide-border">
                {data.developerWorkload.map((item) => (
                  <li key={item.developerId}>
                    <Link
                      href={`/tickets?status=UNRESOLVED&assignedToId=${item.developerId}`}
                      className="flex min-h-11 items-center justify-between gap-3 py-3 text-sm hover:text-brand-700"
                    >
                      <span className="min-w-0 break-words">
                        {item.name}
                        {user?.id === item.developerId ? ' (you)' : ''}
                      </span>
                      <span className="shrink-0 font-semibold tabular-nums">
                        {item.openTickets}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

function Distribution({
  title,
  values,
}: {
  title: string;
  values: { label: string; count: number }[];
}) {
  const total = values.reduce((sum, item) => sum + item.count, 0);
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mb-3 mt-1 text-xs text-muted">{total} tickets in this scope</p>
      <dl className="space-y-2">
        {values.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 text-xs">
            <dt>{titleCase(item.label)}</dt>
            <dd className="tabular-nums text-muted">{item.count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
