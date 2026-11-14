'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { api } from '../../lib/api';
import { ticketReference, titleCase } from '../../lib/format';
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
  const next = data?.items[0];
  const action =
    next?.source === 'scope'
      ? `Review scope revision ${next.revision}`
      : next?.state === 'AWAITING_ACCEPTANCE'
        ? 'Review delivered work'
        : 'Review outcome agreement';
  return (
    <section
      aria-labelledby="delivery-follow-up-title"
      className={personal ? 'portal-section portal-feature' : 'portal-section'}
    >
      {personal ? <p className="portal-kicker mb-2">Assigned to you</p> : null}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="delivery-follow-up-title" className="portal-section-title">
          {personal ? 'Your next decision' : 'Commitments and follow-ups'}
        </h2>
        <Link
          href={personal ? '/delivery?view=mine' : '/delivery'}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
        >
          {personal ? 'View all decisions' : 'View delivery plan'}
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Link>
      </div>
      {loading ? (
        <LoadingState label="Loading delivery plan..." />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : data ? (
        <>
          {data.total === 0 ? (
            <div className="py-4">
              <p className="text-sm text-muted">
                {personal
                  ? 'No decisions are awaiting your review.'
                  : 'No delivery decisions or commitments need follow-up.'}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
                <Link
                  href="/tickets/new"
                  className="meridian-primary inline-flex max-w-full items-center gap-3 rounded-md bg-action text-sm font-semibold text-white"
                >
                  {personal ? 'Request a change' : 'Record a request'}
                  <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                </Link>
                <Link
                  href={personal ? '/tickets?status=UNRESOLVED' : '/projects'}
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700"
                >
                  {personal ? 'View active organisation requests' : 'View projects'}
                </Link>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted">
                <span className="font-semibold tabular-nums text-ink">{data.total}</span>{' '}
                {personal ? 'awaiting your review' : 'current follow-up records across all clients'}
              </p>
              {!personal ? (
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 border-b border-border pb-2">
                  {(['overdue', 'upcoming', 'agreement', 'acceptance', 'changes', 'scope'] as const)
                    .filter((view) => data.counts[view] > 0)
                    .map((view) => (
                      <Link
                        key={view}
                        href={`/delivery?view=${view}`}
                        className="inline-flex min-h-11 items-center gap-2 text-xs text-muted hover:text-brand-700"
                      >
                        {deliveryViewLabels[view]}{' '}
                        <span className="font-semibold tabular-nums text-ink">
                          {data.counts[view]}
                        </span>
                      </Link>
                    ))}
                </div>
              ) : null}
              {personal && next ? (
                <div className="py-5">
                  <p className="meridian-meta break-words text-muted">
                    {ticketReference(next.ticketId)} / {next.projectName} /{' '}
                    {next.source === 'scope' ? 'Scope' : 'Outcome'} R{next.revision}
                  </p>
                  <h3 className="meridian-heading mt-3 break-words text-[28px]">
                    <Link href={next.href} className="hover:text-brand-700">
                      {next.title}
                    </Link>
                  </h3>
                  <p className="mt-3 break-words text-sm leading-6">{next.reason}</p>
                  <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-xs">
                    <div>
                      <dt className="text-muted">Recorded state</dt>
                      <dd className="mt-1 font-medium">{titleCase(next.state)}</dd>
                    </div>
                    <div>
                      <dt className="text-muted">Reviewer</dt>
                      <dd className="mt-1 break-words font-medium">{next.reviewerName}</dd>
                    </div>
                    {next.source === 'delivery' ? (
                      <div>
                        <dt className="text-muted">
                          {next.state === 'PROPOSED' ? 'Proposed target' : 'Agreed target'} (UTC)
                        </dt>
                        <dd className="mt-1 font-medium">{next.targetDate ?? 'Not recorded'}</dd>
                      </div>
                    ) : null}
                  </dl>
                  <Link
                    href={next.href}
                    className="meridian-primary mt-5 inline-flex max-w-full items-center justify-between gap-3 rounded-md bg-action text-sm font-semibold text-white"
                  >
                    <span className="min-w-0 break-words">{action}</span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </Link>
                </div>
              ) : (
                <DeliveryPlanList items={data.items} />
              )}
              {personal && data.items.length > 1 ? (
                <div className="border-t border-border pt-4">
                  <h3 className="text-sm font-semibold">Also awaiting your review</h3>
                  <DeliveryPlanList items={data.items.slice(1)} />
                </div>
              ) : null}
              <p className="mt-2 text-xs text-muted">
                Showing {data.items.length} of {data.total} current records.
              </p>
            </>
          )}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              Updated{' '}
              <time dateTime={data.asOf}>
                {new Date(data.asOf).toLocaleTimeString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </time>
            </span>
            {personal ? (
              <Link
                href="/delivery"
                className="inline-flex min-h-11 items-center text-sm text-brand-700 underline"
              >
                Organisation delivery plan
              </Link>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
