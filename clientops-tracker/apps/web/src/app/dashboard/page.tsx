'use client';

import { Clock, Flame, ListChecks, TimerReset, TriangleAlert } from 'lucide-react';

import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Badge } from '../../components/ui/badge';
import { Card, CardHeader } from '../../components/ui/card';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatHours } from '../../lib/format';
import { useApiData } from '../../lib/use-api-data';

const metricIcons = [ListChecks, Flame, TriangleAlert, TimerReset, Clock];

export default function DashboardPage() {
  const { user } = useAuth();
  const internalUser = user?.role !== 'CLIENT';
  const { data, error, loading, reload } = useApiData(() => api.dashboardMetrics(), []);

  return (
    <ProtectedPage>
      <PageHeader
        description={
          internalUser
            ? 'Support queue and delivery progress across your clients.'
            : 'Support requests and delivery progress for your organisation.'
        }
        title="Dashboard"
      />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={reload} /> : null}

      {data ? (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: 'Open tickets', value: data.totalOpenTickets },
              { label: 'Critical tickets', value: data.criticalTickets },
              { label: 'Waiting for client', value: data.ticketsWaitingForClient },
              { label: 'Resolved this month', value: data.resolvedTicketsThisMonth },
              { label: 'Avg. resolution', value: formatHours(data.averageResolutionTimeHours) },
            ].map((metric, index) => {
              const Icon = metricIcons[index] ?? ListChecks;

              return (
                <Card className="p-5" key={metric.label}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-muted">{metric.label}</p>
                    <Icon className="h-5 w-5 text-brand-700" />
                  </div>
                  <p className="mt-4 break-words text-2xl font-semibold text-ink">{metric.value}</p>
                </Card>
              );
            })}
          </div>

          <div className={`grid gap-6 ${internalUser ? 'xl:grid-cols-3' : 'md:grid-cols-2'}`}>
            <Card>
              <CardHeader title="Tickets by status" />
              <div className="space-y-3 p-5">
                {data.ticketsByStatus.map((item) => (
                  <ProgressRow
                    count={item.count}
                    key={item.status}
                    label={<Badge value={item.status} />}
                    max={Math.max(...data.ticketsByStatus.map((status) => status.count), 1)}
                  />
                ))}
              </div>
            </Card>

            <Card>
              <CardHeader title="Tickets by priority" />
              <div className="space-y-3 p-5">
                {data.ticketsByPriority.map((item) => (
                  <ProgressRow
                    count={item.count}
                    key={item.priority}
                    label={<Badge value={item.priority} />}
                    max={Math.max(...data.ticketsByPriority.map((priority) => priority.count), 1)}
                  />
                ))}
              </div>
            </Card>

            {internalUser && data.developerWorkload ? (
              <Card>
                <CardHeader title="Developer workload" />
                <div className="divide-y divide-border">
                  {data.developerWorkload.length > 0 ? (
                    data.developerWorkload.map((developer) => (
                      <div
                        className="flex items-center justify-between px-5 py-4"
                        key={developer.developerId}
                      >
                        <div>
                          <p className="font-medium text-ink">{developer.name}</p>
                          <p className="text-xs text-muted">{developer.email}</p>
                        </div>
                        <span className="rounded-md bg-slate-100 px-2.5 py-1 text-sm font-semibold text-slate-700">
                          {developer.openTickets} open
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="p-5 text-sm text-muted">
                      No active workload for the current view.
                    </p>
                  )}
                </div>
              </Card>
            ) : null}
          </div>
        </div>
      ) : null}
    </ProtectedPage>
  );
}

function ProgressRow({
  label,
  count,
  max,
}: {
  label: React.ReactNode;
  count: number;
  max: number;
}) {
  const width = `${Math.round((count / max) * 100)}%`;

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <div>{label}</div>
        <span className="text-sm font-semibold text-ink">{count}</span>
      </div>
      <div className="mt-2 h-2 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand-600" style={{ width }} />
      </div>
    </div>
  );
}
