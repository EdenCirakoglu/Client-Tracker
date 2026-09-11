import { and, count, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { clients, projects, tickets, users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import {
  monthBounds,
  organisationScope,
  queuePredicate,
  unresolvedStatuses,
} from './queue.service';

const statuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'] as const;
const priorities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export async function getDashboardMetrics(user: AuthenticatedUser) {
  const now = new Date();
  const resolvedMonth = now.toISOString().slice(0, 7);
  const { start, end } = monthBounds(resolvedMonth);
  const scope = organisationScope(user);
  return db.transaction(
    async (tx) => {
      const [metrics] = await tx
        .select({
          totalOpenTickets: sql<number>`count(*) filter (where ${tickets.status} = 'OPEN')`.mapWith(
            Number,
          ),
          unresolvedTickets:
            sql<number>`count(*) filter (where ${inArray(tickets.status, [...unresolvedStatuses])})`.mapWith(
              Number,
            ),
          criticalTickets:
            sql<number>`count(*) filter (where ${queuePredicate(user, { status: 'UNRESOLVED', priority: 'CRITICAL' })})`.mapWith(
              Number,
            ),
          ticketsWaitingForClient:
            sql<number>`count(*) filter (where ${tickets.status} = 'WAITING_FOR_CLIENT')`.mapWith(
              Number,
            ),
          resolvedTicketsThisMonth:
            sql<number>`count(*) filter (where ${tickets.resolvedAt} >= ${start.toISOString()} and ${tickets.resolvedAt} < ${end.toISOString()})`.mapWith(
              Number,
            ),
          averageResolutionTimeHours: sql<
            string | null
          >`round(avg(extract(epoch from (${tickets.resolvedAt} - ${tickets.createdAt})) / 3600) filter (where ${tickets.resolvedAt} >= ${tickets.createdAt}), 1)`,
        })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(scope);
      const byStatus = await tx
        .select({ status: tickets.status, count: count() })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(scope)
        .groupBy(tickets.status);
      const byPriority = await tx
        .select({ priority: tickets.priority, count: count() })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(scope)
        .groupBy(tickets.priority);
      const workload =
        user.role === 'CLIENT'
          ? []
          : await tx
              .select({
                developerId: users.id,
                name: users.name,
                email: users.email,
                openTickets: count(tickets.id),
              })
              .from(users)
              .leftJoin(
                tickets,
                and(
                  eq(tickets.assignedToId, users.id),
                  inArray(tickets.status, [...unresolvedStatuses]),
                ),
              )
              .where(eq(users.role, 'DEVELOPER'))
              .groupBy(users.id)
              .orderBy(desc(count(tickets.id)), users.id)
              .limit(10);
      const [client] = user.clientId
        ? await tx
            .select({ name: clients.name })
            .from(clients)
            .where(eq(clients.id, user.clientId))
            .limit(1)
        : [];
      return {
        ...metrics,
        averageResolutionTimeHours:
          metrics?.averageResolutionTimeHours == null
            ? null
            : Number(metrics.averageResolutionTimeHours),
        scope:
          user.role === 'CLIENT'
            ? (client?.name ?? 'Your organisation')
            : 'All client organisations',
        generatedAt: now.toISOString(),
        resolvedMonth,
        ticketsByStatus: statuses.map((status) => ({
          status,
          count: byStatus.find((row) => row.status === status)?.count ?? 0,
        })),
        ticketsByPriority: priorities.map((priority) => ({
          priority,
          count: byPriority.find((row) => row.priority === priority)?.count ?? 0,
        })),
        ...(user.role !== 'CLIENT' ? { developerWorkload: workload } : {}),
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
