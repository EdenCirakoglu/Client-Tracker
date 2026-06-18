import { eq } from 'drizzle-orm';

import { db } from '../db/client';
import { users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { listTicketsForUser } from './ticket.service';

const ticketStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'] as const;
const ticketPriorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export async function getDashboardMetrics(user: AuthenticatedUser) {
  const scopedTickets = await listTicketsForUser(user);
  const now = new Date();
  const firstDayOfMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const resolvedTickets = scopedTickets.filter((ticket) => ticket.resolvedAt);

  const averageResolutionTimeHours =
    resolvedTickets.length === 0
      ? null
      : Number(
          (
            resolvedTickets.reduce((total, ticket) => {
              const resolvedAt = ticket.resolvedAt;
              return resolvedAt
                ? total + (resolvedAt.getTime() - ticket.createdAt.getTime())
                : total;
            }, 0) /
            resolvedTickets.length /
            1000 /
            60 /
            60
          ).toFixed(1),
        );

  const developers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
    })
    .from(users)
    .where(eq(users.role, 'DEVELOPER'));

  const developerWorkload = developers
    .map((developer) => ({
      developerId: developer.id,
      name: developer.name,
      email: developer.email,
      openTickets: scopedTickets.filter(
        (ticket) =>
          ticket.assignedToId === developer.id && !['RESOLVED', 'CLOSED'].includes(ticket.status),
      ).length,
    }))
    .filter((workload) => user.role !== 'CLIENT' || workload.openTickets > 0);

  return {
    totalOpenTickets: scopedTickets.filter((ticket) => ticket.status === 'OPEN').length,
    criticalTickets: scopedTickets.filter((ticket) => ticket.priority === 'CRITICAL').length,
    ticketsWaitingForClient: scopedTickets.filter(
      (ticket) => ticket.status === 'WAITING_FOR_CLIENT',
    ).length,
    resolvedTicketsThisMonth: scopedTickets.filter(
      (ticket) => ticket.resolvedAt && ticket.resolvedAt >= firstDayOfMonth,
    ).length,
    averageResolutionTimeHours,
    ticketsByStatus: ticketStatuses.map((status) => ({
      status,
      count: scopedTickets.filter((ticket) => ticket.status === status).length,
    })),
    ticketsByPriority: ticketPriorities.map((priority) => ({
      priority,
      count: scopedTickets.filter((ticket) => ticket.priority === priority).length,
    })),
    developerWorkload,
  };
}
