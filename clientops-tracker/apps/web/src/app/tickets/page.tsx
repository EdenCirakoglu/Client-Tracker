'use client';

import Link from 'next/link';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';

import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { DataTable, Td, Th } from '../../components/ui/table';
import { api } from '../../lib/api';
import { formatDate, titleCase, ticketReference } from '../../lib/format';
import { ticketCategories, ticketPriorities, ticketStatuses } from '../../lib/options';
import { useApiData } from '../../lib/use-api-data';
import { useAuth } from '../../lib/auth';

export default function TicketsPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading tickets..." />}>
      <TicketList />
    </Suspense>
  );
}

function TicketList() {
  const params = useSearchParams();
  const { user } = useAuth();
  const query = params.toString();
  const statusFilter = params.get('status') ?? 'ALL';
  const priorityFilter = params.get('priority') ?? 'ALL';
  const categoryFilter = params.get('category') ?? 'ALL';
  const searchParam = params.get('search') ?? '';
  const [search, setSearch] = useState(searchParam);
  useEffect(() => setSearch(searchParam), [searchParam]);
  useEffect(() => {
    if (search === searchParam) return;
    const timer = setTimeout(() => {
      const next = new URLSearchParams(window.location.search);
      if (search) next.set('search', search);
      else next.delete('search');
      next.delete('page');
      window.history.replaceState(null, '', `/tickets?${next}`);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, searchParam, query]);
  const setFilter = (key: string, value: string) => {
    // Read the latest URL so rapid changes cannot overwrite pending filter edits.
    const next = new URLSearchParams(window.location.search);
    if (value && value !== 'ALL') next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    window.history.pushState(null, '', `/tickets?${next}`);
  };
  const ticketsState = useApiData(() => api.ticketQueue(query), [query]);
  const filteredTickets = ticketsState.data?.items ?? [];

  return (
    <ProtectedPage>
      <PageHeader
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-action bg-action px-4 text-sm font-semibold text-white hover:brightness-110"
            href="/tickets/new"
          >
            <Plus className="h-4 w-4" />
            Create ticket
          </Link>
        }
        description="Track support requests and find the next ticket to work on."
        title="Tickets"
      />

      <div className="mb-4 grid gap-3 md:grid-cols-5">
        <Input
          className="md:col-span-2"
          aria-label="Search tickets"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search tickets"
          value={search}
        />
        <Select
          aria-label="Filter by status"
          onChange={(event) => setFilter('status', event.target.value)}
          value={statusFilter}
        >
          <option value="ALL">All statuses</option>
          <option value="UNRESOLVED">Unresolved</option>
          {ticketStatuses.map((status) => (
            <option key={status} value={status}>
              {titleCase(status)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by priority"
          onChange={(event) => setFilter('priority', event.target.value)}
          value={priorityFilter}
        >
          <option value="ALL">All priorities</option>
          {ticketPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {titleCase(priority)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by category"
          onChange={(event) => setFilter('category', event.target.value)}
          value={categoryFilter}
        >
          <option value="ALL">All categories</option>
          {ticketCategories.map((category) => (
            <option key={category} value={category}>
              {titleCase(category)}
            </option>
          ))}
        </Select>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        {user?.role !== 'CLIENT' ? (
          <Select
            className="max-w-48"
            aria-label="Filter by assignment"
            value={params.get('assignment') ?? 'ALL'}
            onChange={(event) => setFilter('assignment', event.target.value)}
          >
            <option value="ALL">All assignments</option>
            <option value="mine">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </Select>
        ) : null}
        <Select
          className="max-w-48"
          aria-label="Ticket ordering"
          value={params.get('order') ?? 'newest'}
          onChange={(event) => setFilter('order', event.target.value)}
        >
          <option value="newest">Newest first</option>
          <option value="attention">Priority, then oldest</option>
        </Select>
        <Link
          href="/tickets"
          onClick={() => setSearch('')}
          className="inline-flex min-h-10 items-center text-sm font-medium text-brand-700"
        >
          Reset filters
        </Link>
        <span className="text-xs text-muted">
          {user?.role === 'CLIENT' ? 'Your organisation' : 'All client organisations'}
          {params.get('resolvedMonth')
            ? ` · Resolution recorded in ${params.get('resolvedMonth')} (UTC)`
            : ''}
          {params.get('assignedToId') ? ' · Selected developer' : ''}
          {params.get('projectId') ? ' · Selected project' : ''}
        </span>
      </div>

      {ticketsState.loading ? <LoadingState /> : null}
      {ticketsState.error ? (
        <ErrorState message={ticketsState.error} onRetry={ticketsState.reload} />
      ) : null}
      {!ticketsState.loading && ticketsState.data && filteredTickets.length > 0 ? (
        <>
          <p role="status" className="mb-3 text-sm text-muted">
            {ticketsState.data.total} tickets found
          </p>
          <DataTable>
            <thead>
              <tr>
                <Th>Ticket</Th>
                <Th>Project</Th>
                <Th>Client</Th>
                <Th>Status</Th>
                <Th>Priority</Th>
                <Th>Category</Th>
                <Th>Assignee</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id}>
                  <Td className="min-w-72">
                    <Link
                      className="font-semibold text-ink hover:text-brand-700"
                      href={`/tickets/${ticket.id}`}
                    >
                      {ticket.title}
                    </Link>
                    <p className="mt-1 text-xs tabular-nums text-muted" title={ticket.id}>
                      {ticketReference(ticket.id)}
                    </p>
                    <div
                      className="mt-2 flex flex-wrap gap-2 lg:hidden"
                      aria-label="Ticket status and priority"
                    >
                      <Badge value={ticket.status} />
                      <Badge value={ticket.priority} />
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted">{ticket.description}</p>
                  </Td>
                  <Td>{ticket.project?.name ?? 'Not available'}</Td>
                  <Td>{ticket.client.name}</Td>
                  <Td>
                    <Badge value={ticket.status} />
                  </Td>
                  <Td>
                    <Badge value={ticket.priority} />
                  </Td>
                  <Td>
                    <Badge value={ticket.category} />
                  </Td>
                  <Td>{ticket.assignee?.name ?? 'Unassigned'}</Td>
                  <Td>{formatDate(ticket.createdAt)}</Td>
                </tr>
              ))}
            </tbody>
          </DataTable>
          <div className="mt-4 flex items-center justify-between gap-3">
            <Button
              variant="secondary"
              disabled={ticketsState.data.page === 1}
              onClick={() => setFilter('page', String(ticketsState.data!.page - 1))}
            >
              Previous
            </Button>
            <span className="text-sm text-muted">
              Page {ticketsState.data.page} of{' '}
              {Math.max(1, Math.ceil(ticketsState.data.total / ticketsState.data.limit))}
            </span>
            <Button
              variant="secondary"
              disabled={ticketsState.data.page * ticketsState.data.limit >= ticketsState.data.total}
              onClick={() => setFilter('page', String(ticketsState.data!.page + 1))}
            >
              Next
            </Button>
          </div>
        </>
      ) : !ticketsState.loading && ticketsState.data ? (
        <EmptyState
          action={
            <Button type="button" onClick={() => window.location.assign('/tickets/new')}>
              Create ticket
            </Button>
          }
          description="Create a ticket or adjust the filters to broaden the result set."
          title="No tickets found"
        />
      ) : null}
    </ProtectedPage>
  );
}
