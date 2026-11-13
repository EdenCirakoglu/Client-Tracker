import Link from 'next/link';
import type { DashboardMetrics } from '../../lib/types';

interface MetricCardsProps {
  metrics: DashboardMetrics;
  client: boolean;
}
export function MetricCards({ metrics, client }: MetricCardsProps) {
  const items = [
    {
      label: client ? 'Active requests' : 'Unresolved',
      value: metrics.unresolvedTickets,
      query: 'status=UNRESOLVED',
    },
    {
      label: 'Critical unresolved',
      value: metrics.criticalTickets,
      query: 'status=UNRESOLVED&priority=CRITICAL',
    },
    {
      label: client ? 'Waiting for your organisation' : 'Waiting for client',
      value: metrics.ticketsWaitingForClient,
      query: 'status=WAITING_FOR_CLIENT',
    },
    {
      label: 'Resolved this month',
      value: metrics.resolvedTicketsThisMonth,
      query: `resolvedMonth=${metrics.resolvedMonth}`,
    },
  ];
  return (
    <section aria-labelledby="request-overview-title">
      <h3 id="request-overview-title" className="mb-3 text-sm font-semibold">
        Request overview
      </h3>
      <div className="divide-y divide-border">
        {items.map(({ label, value, query }) => (
          <Link
            key={label}
            href={`/tickets?${query}`}
            aria-label={`${label}: ${value}`}
            className="flex min-h-12 items-center justify-between gap-4 py-3 hover:text-brand-700"
          >
            <span className="min-w-0 break-words text-xs text-muted">{label}</span>
            <span className="shrink-0 text-lg font-semibold tabular-nums">{value}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
