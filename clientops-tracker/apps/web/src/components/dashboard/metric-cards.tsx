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
      label: client ? 'Your reply needed' : 'Waiting for client',
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
      <h2 id="request-overview-title" className="mb-3 text-base font-semibold">
        Request overview
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {items.map(({ label, value, query }) => (
          <Link
            key={label}
            href={`/tickets?${query}`}
            aria-label={`${label}: ${value}`}
            className="rounded-lg border border-border bg-panel p-4 hover:border-brand-600"
          >
            <span className="block text-xs text-muted">{label}</span>
            <span className="mt-2 block text-2xl font-semibold tabular-nums">{value}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
