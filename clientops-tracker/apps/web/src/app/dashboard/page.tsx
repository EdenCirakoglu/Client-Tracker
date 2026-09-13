'use client';
import Link from 'next/link';
import {
  Clock3,
  Flame,
  ListChecks,
  Plus,
  RefreshCw,
  TimerReset,
  TriangleAlert,
} from 'lucide-react';
import { useState } from 'react';
import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Card } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { NeedsAttention } from '../../components/dashboard/needs-attention';
import { RecentActivity, RecentReleases } from '../../components/dashboard/recent-activity';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatHours, titleCase } from '../../lib/format';
import { useApiData } from '../../lib/use-api-data';

export default function DashboardPage() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const { data, error, loading, reload } = useApiData(() => api.dashboardMetrics(), [refresh]);
  const client = user?.role === 'CLIENT';
  const developer = user?.role === 'DEVELOPER';
  return (
    <ProtectedPage>
      <PageHeader
        title="Dashboard"
        description={
          client
            ? 'Your support requests and latest delivery updates.'
            : developer
              ? 'Your work queue, with the wider team in view.'
              : 'Keep support moving. Review unassigned requests and critical issues.'
        }
        action={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              disabled={loading}
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw className="h-4 w-4" />
              {loading ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Link
              href="/tickets/new"
              className="inline-flex h-10 items-center gap-2 rounded-md bg-action px-3 text-sm font-semibold text-white sm:hidden"
            >
              <Plus className="h-4 w-4" />
              New ticket
            </Link>
          </div>
        }
      />
      {loading && !data ? (
        <LoadingState label="Loading overview..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {data.scope}
              {developer ? ' · Team snapshot' : ''}
            </span>
            <span>
              Updated{' '}
              <time dateTime={data.generatedAt}>
                {new Date(data.generatedAt).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </span>
          </div>
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            {[
              {
                label: client ? 'Active requests' : 'Unresolved',
                value: data.unresolvedTickets,
                query: 'status=UNRESOLVED',
                Icon: ListChecks,
              },
              {
                label: 'Critical unresolved',
                value: data.criticalTickets,
                query: 'status=UNRESOLVED&priority=CRITICAL',
                Icon: Flame,
              },
              {
                label: client ? 'Your reply needed' : 'Waiting for client',
                value: data.ticketsWaitingForClient,
                query: 'status=WAITING_FOR_CLIENT',
                Icon: TriangleAlert,
              },
              {
                label: 'Resolved this month',
                value: data.resolvedTicketsThisMonth,
                query: `resolvedMonth=${data.resolvedMonth}`,
                Icon: TimerReset,
              },
            ].map(({ label, value, query, Icon }) => (
              <Link
                key={label}
                href={`/tickets?${query}`}
                aria-label={`${label}: ${value}`}
                className="rounded-lg border border-border bg-panel p-4 hover:border-brand-600 lg:p-5"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-sm text-muted">{label}</span>
                  <Icon className="h-4 w-4 text-muted" />
                </div>
                <span className="mt-3 block text-3xl font-semibold tabular-nums">{value}</span>
              </Link>
            ))}
          </div>
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,1fr)]">
            <div className="min-w-0 space-y-8">
              {user ? <NeedsAttention role={user.role} refresh={refresh} /> : null}
              <div className="grid gap-6 md:grid-cols-2">
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
              </div>
            </div>
            <aside className="min-w-0 space-y-8" aria-label="Supporting information">
              {!client && data.developerWorkload ? (
                <section>
                  <h2 className="text-lg font-semibold">Developer workload</h2>
                  <p className="mt-1 text-xs text-muted">
                    Team assignments · unresolved now · up to 10 developers
                  </p>
                  <ul className="mt-3 divide-y divide-border">
                    {data.developerWorkload.map((item) => (
                      <li key={item.developerId}>
                        <Link
                          href={`/tickets?status=UNRESOLVED&assignedToId=${item.developerId}`}
                          className="flex min-h-14 items-center justify-between gap-3 py-3 text-sm hover:text-brand-700"
                        >
                          <span className="min-w-0 break-words">
                            {item.name}
                            {user?.id === item.developerId ? ' (you)' : ''}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-1 font-semibold tabular-nums">
                            {item.openTickets}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              <RecentReleases refresh={refresh} />
              <RecentActivity key={refresh} refresh={refresh} client={client} />
              <Card className="p-4">
                <h2 className="flex items-center gap-2 text-base font-semibold">
                  <Clock3 className="h-4 w-4 text-muted" />
                  Resolution time
                </h2>
                <p className="mt-3 text-xl font-semibold tabular-nums">
                  {formatHours(data.averageResolutionTimeHours)}
                </p>
                <p className="mt-2 text-xs leading-5 text-muted">
                  Mean time from creation to the recorded resolution, across this scope. Reopened
                  tickets keep their first resolution timestamp; this is not a lifecycle performance
                  measure.
                </p>
              </Card>
            </aside>
          </div>
        </>
      ) : null}
    </ProtectedPage>
  );
}
interface DistributionProps {
  title: string;
  values: { label: string; count: number }[];
}
function Distribution({ title, values }: DistributionProps) {
  const total = values.reduce((sum, item) => sum + item.count, 0);
  return (
    <section>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        Count and share of {total} tickets in this scope
      </p>
      <div className="space-y-3">
        {values.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span>{titleCase(item.label)}</span>
              <span className="tabular-nums text-muted">{item.count}</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-100">
              <div
                className="h-1.5 rounded-full bg-action"
                style={{ width: `${total ? (item.count / total) * 100 : 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
