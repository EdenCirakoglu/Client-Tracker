'use client';
import Link from 'next/link';
import { api } from '../../lib/api';
import { useApiData } from '../../lib/use-api-data';
import { DeliveryPlanList, deliveryViewLabels } from '../delivery/plan-list';
import { ErrorState, LoadingState } from '../ui/states';

interface DeliveryFollowUpProps {
  refresh: number;
  personal?: boolean;
}
export function DeliveryFollowUp({ refresh, personal = false }: DeliveryFollowUpProps) {
  const { data, error, loading, reload } = useApiData(
    () => api.deliveryPlan(`limit=4&view=${personal ? 'mine' : 'followup'}`),
    [refresh, personal],
  );
  return (
    <section aria-labelledby="delivery-follow-up-title" className="journal-decision">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="delivery-follow-up-title" className="text-lg font-semibold">
          {personal ? 'My decisions' : 'Delivery follow-up'}
        </h2>
        <Link
          href={personal ? '/delivery?view=mine' : '/delivery'}
          className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-700"
        >
          {personal ? 'View all decisions' : 'View delivery plan'}
        </Link>
      </div>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingState label="Loading delivery plan..." />
      ) : data ? (
        <>
          <p className="mb-3 text-sm text-muted">
            {personal
              ? 'Scope, outcomes and delivered work assigned to you for review.'
              : 'Agreed commitments and client decisions across the team. Owners and reasons are shown on each record.'}
          </p>
          {personal ? (
            <p className="border-b border-border pb-3 text-sm font-semibold tabular-nums">
              {data.total} awaiting your review
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-5 gap-y-1 border-b border-border pb-2">
              {(['overdue', 'upcoming', 'agreement', 'acceptance', 'scope'] as const).map(
                (view) => (
                  <Link
                    key={view}
                    href={`/delivery?view=${view}`}
                    className="inline-flex min-h-10 items-center gap-2 text-xs text-muted hover:text-brand-700"
                  >
                    {deliveryViewLabels[view]}{' '}
                    <span className="font-semibold tabular-nums text-ink">{data.counts[view]}</span>
                  </Link>
                ),
              )}
            </div>
          )}
          {data.items.length ? (
            <DeliveryPlanList items={data.items} />
          ) : (
            <p className="py-4 text-sm text-muted">
              {personal
                ? 'You have no decisions to review. Organisation updates remain available in the delivery plan.'
                : 'No delivery decisions or commitments need follow-up.'}
            </p>
          )}
          <p className="mt-1 text-xs text-muted">
            Showing {data.items.length} of {data.total} current records. Agreed dates are separate
            from ticket status.
          </p>
          {personal ? (
            <Link
              href="/delivery"
              className="mt-2 inline-flex min-h-10 items-center text-sm text-brand-700 underline"
            >
              Organisation delivery plan
            </Link>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
