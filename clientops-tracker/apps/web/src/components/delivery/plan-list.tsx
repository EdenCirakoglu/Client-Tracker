import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { DeliveryPlanItem, DeliveryView } from '../../lib/types';
import { ticketReference } from '../../lib/format';

export const deliveryViewLabels: Record<DeliveryView, string> = {
  followup: 'Delivery follow-up',
  overdue: 'Past agreed target',
  upcoming: 'Due in next 7 days',
  agreement: 'Outcome agreement needed',
  acceptance: 'Awaiting acceptance',
  changes: 'Changes requested',
  scope: 'Scope approval needed',
  all: 'All delivery records and pending scopes',
};
interface DeliveryPlanListProps {
  items: DeliveryPlanItem[];
}
export function DeliveryPlanList({ items }: DeliveryPlanListProps) {
  return (
    <ul className="divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="py-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-xs text-muted">
                {ticketReference(item.ticketId)} / {item.projectName}
              </p>
              <Link
                href={item.href}
                className="break-words text-sm font-semibold hover:text-brand-700 hover:underline"
              >
                {item.title}
              </Link>
            </div>
            {item.yourDecision ? (
              <span className="rounded-md bg-brand-50 px-2 py-1 text-xs font-semibold text-brand-700">
                Your decision
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm">{item.reason}</p>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs text-muted">
            <span>
              {item.source === 'delivery'
                ? `Target: ${item.targetDate ?? 'Not set'}${item.targetDate ? ' (UTC)' : ''} / Owner: ${item.ownerName ?? 'Not recorded'}`
                : `Scope revision ${item.revision}`}
            </span>
            <Link
              href={item.href}
              aria-label={`${item.yourDecision ? 'Review decision' : 'Open record'}: ${item.title}`}
              className="inline-flex min-h-10 items-center gap-1 font-semibold text-brand-700"
            >
              {item.yourDecision ? 'Review decision' : 'Open record'}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        </li>
      ))}
    </ul>
  );
}
