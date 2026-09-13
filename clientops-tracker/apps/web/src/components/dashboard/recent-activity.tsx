'use client';
import Link from 'next/link';
import { useState } from 'react';
import { MessageSquare, Rocket, Ticket } from 'lucide-react';
import { api } from '../../lib/api';
import { useApiData } from '../../lib/use-api-data';
import { Button } from '../ui/button';
import { ErrorState, LoadingState } from '../ui/states';

interface RecentActivityProps {
  refresh: number;
  client: boolean;
}
const actions: Record<string, string> = {
  TICKET_CREATED: 'opened a ticket',
  STATUS_CHANGED: 'changed the status',
  PRIORITY_CHANGED: 'changed the priority',
  CATEGORY_CHANGED: 'changed the category',
  ASSIGNEE_CHANGED: 'changed the assignee',
  TRIAGE_SUGGESTION_APPLIED: 'applied a triage suggestion',
  PUBLIC_COMMENT: 'added a reply',
  INTERNAL_COMMENT: 'added an internal note',
  RELEASE_ADDED: 'Release added',
};

export function RecentReleases({ refresh }: { refresh: number }) {
  const state = useApiData(() => api.activity('kind=release&limit=3'), [refresh]);
  return (
    <section aria-labelledby="recent-releases-heading">
      <h2 id="recent-releases-heading" className="text-lg font-semibold">
        Recent releases
      </h2>
      {state.loading ? (
        <LoadingState label="Loading releases..." />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <ul className="mt-2 divide-y divide-border">
            {state.data.items.map((item) => (
              <li key={item.id} className="py-3">
                <Link
                  className="break-words text-sm font-medium hover:text-brand-700"
                  href={`/releases#release-${item.recordId}`}
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs text-muted">{item.project}</p>
              </li>
            ))}
          </ul>
          {!state.data.items.length ? (
            <p className="mt-3 text-sm text-muted">No releases yet.</p>
          ) : null}
          <Link
            href="/releases"
            className="inline-flex min-h-10 items-center text-sm font-medium text-brand-700"
          >
            View release history
          </Link>
        </>
      ) : null}
    </section>
  );
}
export function RecentActivity({ refresh, client }: RecentActivityProps) {
  const [paging, setPaging] = useState({ page: 1, before: '' });
  const query = new URLSearchParams({
    page: String(paging.page),
    limit: '5',
    ...(paging.before ? { before: paging.before } : {}),
  }).toString();
  const state = useApiData(() => api.activity(query), [query, refresh]);
  return (
    <section aria-labelledby="activity-heading" className="min-w-0">
      <h2 id="activity-heading" className="text-lg font-semibold">
        {client ? 'Public updates' : 'Recent activity'}
      </h2>
      <p className="mb-4 mt-1 text-xs text-muted">
        {client
          ? 'Replies, status changes and releases for your organisation'
          : 'Ticket updates and releases across the team'}
      </p>
      {state.loading ? (
        <LoadingState label="Loading activity..." />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <ul className="divide-y divide-border">
            {state.data.items.map((item) => {
              const Icon =
                item.kind === 'release'
                  ? Rocket
                  : item.action.includes('COMMENT')
                    ? MessageSquare
                    : Ticket;
              return (
                <li key={item.id} className="flex gap-3 py-4">
                  <Icon className="mt-0.5 h-4 w-4 text-muted" />
                  <div className="min-w-0 text-sm">
                    <p className="text-muted">
                      {item.actor ? (
                        <span className="font-medium text-ink">{item.actor} </span>
                      ) : null}
                      {actions[item.action] ?? 'updated a record'}
                    </p>
                    <Link
                      href={
                        item.kind === 'ticket'
                          ? `/tickets/${item.recordId}`
                          : `/releases#release-${item.recordId}`
                      }
                      className="mt-1 block break-words font-medium hover:text-brand-700"
                    >
                      {item.title}
                    </Link>
                    <p className="mt-1 text-xs text-muted">{item.project}</p>
                    <time
                      dateTime={item.createdAt}
                      className="mt-1 block text-xs tabular-nums text-muted"
                    >
                      {new Date(item.createdAt).toLocaleString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                </li>
              );
            })}
          </ul>
          {!state.data.items.length ? (
            <p className="py-4 text-sm text-muted">No activity yet.</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              disabled={paging.page === 1}
              onClick={() => setPaging({ page: paging.page - 1, before: state.data!.before })}
            >
              Newer
            </Button>
            <span className="text-xs text-muted">Page {paging.page}</span>
            <Button
              variant="ghost"
              disabled={!state.data.hasMore}
              onClick={() => setPaging({ page: paging.page + 1, before: state.data!.before })}
            >
              Older
            </Button>
          </div>
        </>
      ) : null}
    </section>
  );
}
