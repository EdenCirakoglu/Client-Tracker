'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input, Select } from '../../components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { DataTable, Td, Th } from '../../components/ui/table';
import { api } from '../../lib/api';
import { formatDate, titleCase } from '../../lib/format';
import { ticketCategories, ticketPriorities, ticketStatuses } from '../../lib/options';
import { useApiData } from '../../lib/use-api-data';

export default function TicketsPage() {
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const ticketsState = useApiData(() => api.tickets(), []);
  const clientsState = useApiData(() => api.clients(), []);

  const clientById = useMemo(
    () => new Map((clientsState.data ?? []).map((client) => [client.id, client])),
    [clientsState.data],
  );

  const filteredTickets = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return (ticketsState.data ?? []).filter((ticket) => {
      const statusMatches = statusFilter === 'ALL' || ticket.status === statusFilter;
      const priorityMatches = priorityFilter === 'ALL' || ticket.priority === priorityFilter;
      const categoryMatches = categoryFilter === 'ALL' || ticket.category === categoryFilter;
      const searchMatches =
        normalizedSearch.length === 0 ||
        ticket.title.toLowerCase().includes(normalizedSearch) ||
        ticket.description.toLowerCase().includes(normalizedSearch);

      return statusMatches && priorityMatches && categoryMatches && searchMatches;
    });
  }, [categoryFilter, priorityFilter, search, statusFilter, ticketsState.data]);

  return (
    <ProtectedPage>
      <PageHeader
        action={
          <Link
            className="inline-flex h-10 items-center gap-2 rounded-md border border-brand-700 bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
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
          onChange={(event) => setStatusFilter(event.target.value)}
          value={statusFilter}
        >
          <option value="ALL">All statuses</option>
          {ticketStatuses.map((status) => (
            <option key={status} value={status}>
              {titleCase(status)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="Filter by priority"
          onChange={(event) => setPriorityFilter(event.target.value)}
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
          onChange={(event) => setCategoryFilter(event.target.value)}
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

      {ticketsState.loading ? <LoadingState /> : null}
      {ticketsState.error ? (
        <ErrorState message={ticketsState.error} onRetry={ticketsState.reload} />
      ) : null}
      {ticketsState.data && filteredTickets.length > 0 ? (
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
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{ticket.description}</p>
                </Td>
                <Td>{ticket.project?.name ?? 'Not available'}</Td>
                <Td>
                  {ticket.project
                    ? (clientById.get(ticket.project.clientId)?.name ?? 'Not available')
                    : 'Not available'}
                </Td>
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
      ) : ticketsState.data ? (
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
