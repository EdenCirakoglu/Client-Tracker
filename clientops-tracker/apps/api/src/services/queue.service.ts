import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { clients, projects, tickets, users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';

export const queueQuerySchema = z
  .object({
    status: z
      .enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED', 'UNRESOLVED'])
      .optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    category: z.enum(['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'SECURITY', 'PERFORMANCE']).optional(),
    assignment: z.enum(['mine', 'unassigned']).optional(),
    assignedToId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    resolvedMonth: z
      .string()
      .regex(/^[1-9]\d{3}-(0[1-9]|1[0-2])$/)
      .refine((value) => Number(value.slice(0, 4)) < 9999, 'Year must be before 9999.')
      .optional(),
    search: z.string().trim().max(200).optional(),
    order: z.enum(['newest', 'attention']).default('newest'),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();
export type QueueQuery = z.infer<typeof queueQuerySchema>;
export const unresolvedStatuses = ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT'] as const;

export function organisationScope(user: AuthenticatedUser) {
  return user.role === 'CLIENT'
    ? user.clientId
      ? eq(projects.clientId, user.clientId)
      : sql`false`
    : sql`true`;
}

export function monthBounds(month: string) {
  const start = new Date(`${month}-01T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  return { start, end };
}

export function queuePredicate(user: AuthenticatedUser, query: Partial<QueueQuery>) {
  if (user.role === 'CLIENT' && (query.assignment || query.assignedToId)) {
    throw new ApiError(403, 'FORBIDDEN', 'Team assignment filters are internal only.');
  }
  const period = query.resolvedMonth ? monthBounds(query.resolvedMonth) : null;
  const search = query.search?.replace(/[\\%_]/g, '\\$&');
  return and(
    organisationScope(user),
    query.status === 'UNRESOLVED'
      ? inArray(tickets.status, [...unresolvedStatuses])
      : query.status
        ? eq(tickets.status, query.status)
        : undefined,
    query.priority ? eq(tickets.priority, query.priority) : undefined,
    query.category ? eq(tickets.category, query.category) : undefined,
    query.projectId ? eq(tickets.projectId, query.projectId) : undefined,
    query.assignment === 'mine' ? eq(tickets.assignedToId, user.id) : undefined,
    query.assignment === 'unassigned' ? isNull(tickets.assignedToId) : undefined,
    query.assignedToId ? eq(tickets.assignedToId, query.assignedToId) : undefined,
    period
      ? and(gte(tickets.resolvedAt, period.start), lt(tickets.resolvedAt, period.end))
      : undefined,
    search
      ? or(ilike(tickets.title, `%${search}%`), ilike(tickets.description, `%${search}%`))
      : undefined,
  );
}

export async function getTicketQueue(user: AuthenticatedUser, query: QueueQuery) {
  const predicate = queuePredicate(user, query);
  // Count and page describe the same database snapshot, even while tickets are being edited.
  return db.transaction(
    async (tx) => {
      const [total] = await tx
        .select({ count: count() })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(predicate);
      const rows = await tx
        .select({
          ticket: tickets,
          project: projects,
          client: { id: clients.id, name: clients.name },
          assignee: { id: users.id, name: users.name },
        })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .innerJoin(clients, eq(projects.clientId, clients.id))
        .leftJoin(users, eq(tickets.assignedToId, users.id))
        .where(predicate)
        .orderBy(
          ...(query.order === 'attention'
            ? [
                sql`case ${tickets.priority} when 'CRITICAL' then 0 when 'HIGH' then 1 when 'MEDIUM' then 2 else 3 end`,
                asc(tickets.createdAt),
                asc(tickets.id),
              ]
            : [desc(tickets.createdAt), desc(tickets.id)]),
        )
        .limit(query.limit)
        .offset((query.page - 1) * query.limit);
      return {
        items: rows.map(({ ticket, ...relations }) => ({ ...ticket, ...relations })),
        total: total?.count ?? 0,
        page: query.page,
        limit: query.limit,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
