'use client';
import Link from 'next/link';
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../lib/api';
import { ticketReference } from '../../lib/format';
import type { TicketQueueItem } from '../../lib/types';
import { useApiData } from '../../lib/use-api-data';
import { Badge } from '../ui/badge';
import { ErrorState, LoadingState } from '../ui/states';

const lanes = [
  { id: 'ready', label: 'Ready for me', empty: 'No tickets ready for your next action.' },
  {
    id: 'changes',
    label: 'Changes requested',
    empty: 'No requested changes on your assigned tickets.',
  },
  {
    id: 'waiting',
    label: 'Waiting for client',
    empty: 'No assigned tickets waiting for the client.',
  },
] as const;
type Lane = (typeof lanes)[number]['id'];
const filters = (lane: Lane) => `assignment=mine&workflow=${lane}&order=attention`;

export function DeveloperWorkflow({ refresh }: { refresh: number }) {
  const [selected, setSelected] = useState<Lane>('ready');
  const ready = useApiData(() => api.ticketQueue(`${filters('ready')}&limit=5`), [refresh]);
  const changes = useApiData(() => api.ticketQueue(`${filters('changes')}&limit=5`), [refresh]);
  const waiting = useApiData(() => api.ticketQueue(`${filters('waiting')}&limit=5`), [refresh]);
  const states = { ready, changes, waiting };
  const state = states[selected];
  const lane = lanes.find((item) => item.id === selected)!;
  return (
    <section className="portal-section portal-feature" aria-labelledby="workflow-heading">
      <p className="portal-kicker mb-2">Assigned to you</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="workflow-heading" className="portal-section-title">
          Your next actions
        </h2>
        <Link
          href={`/tickets?${filters(selected)}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
        >
          View all <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      </div>
      <div
        className="portal-tabs mb-4 mt-3 flex flex-wrap gap-1"
        role="group"
        aria-label="Assigned workflow"
      >
        {lanes.map((item) => {
          const count = states[item.id];
          return (
            <button
              key={item.id}
              type="button"
              aria-pressed={selected === item.id}
              onClick={() => setSelected(item.id)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-medium text-muted aria-pressed:bg-brand-50 aria-pressed:text-brand-700"
            >
              {item.label}
              <span className="inline-flex min-w-5 justify-center tabular-nums">
                {count.loading ? (
                  <span aria-label="Loading count">...</span>
                ) : count.error ? (
                  <AlertCircle className="h-4 w-4" aria-label="Count unavailable" />
                ) : count.data ? (
                  count.data.total
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      {state.loading ? (
        <LoadingState label="Loading assigned work..." />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          {state.data.items.length ? (
            <ul className="divide-y divide-border">
              {state.data.items.map((ticket) => (
                <WorkflowRow key={ticket.id} ticket={ticket} />
              ))}
            </ul>
          ) : (
            <p className="py-5 text-sm text-muted">{lane.empty}</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Showing {state.data.items.length} of {state.data.total} assigned tickets in{' '}
            {lane.label.toLowerCase()}.
          </p>
        </>
      ) : null}
    </section>
  );
}

function WorkflowRow({ ticket }: { ticket: TicketQueueItem }) {
  const href = ticket.workflowHref ?? `/tickets/${ticket.id}`;
  const action = ticket.nextAction ?? 'Open ticket';
  const reason = ticket.actionReason;
  return (
    <li className="portal-row py-4">
      <p className="meridian-meta break-words text-muted">
        {ticketReference(ticket.id)} / {ticket.client.name} / {ticket.project?.name}
      </p>
      <h3 className="mt-2 break-words text-base font-semibold">
        <Link href={href} className="hover:text-brand-700">
          {ticket.title}
        </Link>
      </h3>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge value={ticket.status} />
        <Badge value={ticket.priority} />
      </div>
      {reason ? <p className="mt-3 break-words text-sm leading-6 text-muted">{reason}</p> : null}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <span className="break-words text-xs text-muted">
          Assigned to {ticket.assignee?.name ?? 'you'}
        </span>
        <Link
          href={href}
          aria-label={`${action}: ${ticket.title}`}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
        >
          {action}
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Link>
      </div>
    </li>
  );
}
