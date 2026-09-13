'use client';
import Link from 'next/link';
import { ArrowRight, Clock3 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { EmptyState, ErrorState, LoadingState } from '../ui/states';
import { api } from '../../lib/api';
import { useApiData } from '../../lib/use-api-data';
import type { UserRole } from '../../lib/types';
import { useState } from 'react';
import { ticketReference } from '../../lib/format';

interface NeedsAttentionProps {
  role: UserRole;
  refresh: number;
}

export function NeedsAttention({ role, refresh }: NeedsAttentionProps) {
  const [selected, setSelected] = useState('');
  const tabs =
    role === 'CLIENT'
      ? [
          { id: 'reply', label: 'Your reply needed' },
          { id: 'active', label: 'Active requests' },
        ]
      : [
          { id: 'mine', label: 'My work' },
          { id: 'unassigned', label: 'Unassigned' },
          { id: 'critical', label: 'Critical' },
        ];
  const tab = selected || (role === 'ADMIN' ? 'unassigned' : role === 'CLIENT' ? 'reply' : 'mine');
  const query = new URLSearchParams({
    status: tab === 'reply' ? 'WAITING_FOR_CLIENT' : 'UNRESOLVED',
    order: 'attention',
  });
  if (tab === 'mine' || tab === 'unassigned') query.set('assignment', tab);
  if (tab === 'critical') query.set('priority', 'CRITICAL');
  const filters = query.toString();
  const state = useApiData(() => api.ticketQueue(`${filters}&limit=5`), [filters, refresh]);
  return (
    <section aria-labelledby="attention-heading" className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 id="attention-heading" className="text-lg font-semibold">
          Needs attention
        </h2>
        <Link
          href={`/tickets?${filters}`}
          className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-brand-700"
        >
          View all
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div
        className="mb-4 flex flex-wrap gap-1 border-b border-border pb-3"
        role="group"
        aria-label="Attention queue"
      >
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setSelected(item.id)}
            aria-pressed={tab === item.id}
            className="min-h-10 rounded-md px-3 text-sm font-medium text-muted hover:bg-slate-100 aria-pressed:bg-brand-50 aria-pressed:text-brand-700"
          >
            {item.label}
          </button>
        ))}
      </div>
      {state.loading ? (
        <LoadingState label="Loading tickets..." />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <p className="mb-3 text-xs text-muted">
            {state.data.total}{' '}
            {role === 'CLIENT'
              ? state.data.total === 1
                ? 'request'
                : 'requests'
              : state.data.total === 1
                ? 'ticket'
                : 'tickets'}
            {tab === 'mine' ? ' assigned to you' : ''}
          </p>
          {state.data.items.length ? (
            <ul className="divide-y divide-border rounded-lg border border-border bg-panel">
              {state.data.items.map((ticket) => (
                <li key={ticket.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="mb-1 text-xs text-muted">
                        <span className="tabular-nums" title={ticket.id}>
                          {ticketReference(ticket.id)}
                        </span>{' '}
                        &middot; {ticket.project?.name}
                      </p>
                      <Link
                        href={`/tickets/${ticket.id}`}
                        className="break-words text-sm font-semibold text-ink hover:text-brand-700"
                      >
                        {ticket.title}
                      </Link>
                    </div>
                    <ArrowRight className="mt-5 h-4 w-4 text-muted" aria-hidden="true" />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge value={ticket.status} />
                    <Badge value={ticket.priority} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {tab === 'reply'
                        ? 'Your reply needed'
                        : tab === 'critical'
                          ? 'Critical priority'
                          : (ticket.assignee?.name ?? 'Unassigned')}
                    </span>
                    <span className="inline-flex items-center gap-1 tabular-nums">
                      <Clock3 className="h-3 w-3" />
                      {Math.max(
                        0,
                        Math.floor((Date.now() - new Date(ticket.createdAt).getTime()) / 86400000),
                      )}
                      d since opened
                    </span>
                  </div>
                  <Link
                    href={`/tickets/${ticket.id}`}
                    aria-label={`${tab === 'reply' ? 'Reply to' : 'Review'} ${ticket.title}`}
                    className="mt-2 inline-flex min-h-10 items-center text-sm font-medium text-brand-700"
                  >
                    {tab === 'reply' ? 'Open and reply' : 'Review ticket'}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={
                tab === 'mine'
                  ? 'No assigned tickets'
                  : tab === 'reply'
                    ? 'No replies needed'
                    : 'Nothing needs attention here'
              }
              description={
                tab === 'mine'
                  ? 'Your assigned requests are up to date.'
                  : 'Choose another queue or view all support requests.'
              }
              action={
                <Link
                  href="/tickets"
                  className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-700"
                >
                  Browse tickets
                </Link>
              }
            />
          )}
        </>
      ) : null}
    </section>
  );
}
