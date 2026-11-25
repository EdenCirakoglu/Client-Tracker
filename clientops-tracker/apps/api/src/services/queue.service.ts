import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lt, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { clients, deliveryRevisions, projects, scopeProposals, tickets, users } from '../db/schema';
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
    workflow: z.enum(['ready', 'changes', 'waiting']).optional(),
    assignedToId: z.string().uuid().optional(),
    projectId: z.string().uuid().optional(),
    clientId: z.string().uuid().optional(),
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

type WorkflowRevision = { id: string; revision: number; state: string };
type ScopeWorkflowRevision = WorkflowRevision & { approverName: string };
type DeliveryWorkflowRevision = WorkflowRevision & { reviewerName: string };

// Correlated scalar queries keep one row per ticket and use the existing revision indexes.
const latestScope = sql<ScopeWorkflowRevision | null>`(
  select json_build_object('id', ${scopeProposals.id}, 'revision', ${scopeProposals.revision}, 'state', ${scopeProposals.state}, 'approverName', ${scopeProposals.approverName})
  from ${scopeProposals} where ${scopeProposals.ticketId} = ${tickets.id}
  order by ${scopeProposals.revision} desc limit 1
)`;
const latestDelivery = sql<DeliveryWorkflowRevision | null>`(
  select json_build_object('id', ${deliveryRevisions.id}, 'revision', ${deliveryRevisions.revision}, 'state', ${deliveryRevisions.state}, 'reviewerName', ${deliveryRevisions.reviewerName})
  from ${deliveryRevisions} where ${deliveryRevisions.ticketId} = ${tickets.id}
  order by ${deliveryRevisions.revision} desc limit 1
)`;
const workflowLane = sql`case
  when ${latestScope}->>'state' = 'CHANGES_REQUESTED'
    or ${latestDelivery}->>'state' = 'CHANGES_REQUESTED' then 'changes'
  when ${latestScope}->>'state' = 'PROPOSED'
    or ${latestDelivery}->>'state' in ('PROPOSED', 'AWAITING_ACCEPTANCE')
    or ${tickets.status} = 'WAITING_FOR_CLIENT' then 'waiting'
  when ${inArray(tickets.status, [...unresolvedStatuses])} then 'ready'
  else null end`;

function workflowAction(
  ticketId: string,
  scope: ScopeWorkflowRevision | null,
  delivery: DeliveryWorkflowRevision | null,
  status: string,
) {
  const href = `/tickets/${ticketId}`;
  if (scope?.state === 'CHANGES_REQUESTED')
    return {
      workflowHref: `${href}#scope`,
      nextAction: 'Review scope changes',
      actionReason: `Changes requested on scope revision ${scope.revision}.`,
    };
  if (delivery?.state === 'CHANGES_REQUESTED')
    return {
      workflowHref: `${href}#delivery`,
      nextAction: 'Review delivery changes',
      actionReason: `Changes requested on delivery revision ${delivery.revision}.`,
    };
  if (scope?.state === 'PROPOSED')
    return {
      workflowHref: `${href}#scope`,
      nextAction: 'View scope proposal',
      actionReason: `Scope revision ${scope.revision} is awaiting a decision from ${scope.approverName}.`,
    };
  if (delivery?.state === 'PROPOSED' || delivery?.state === 'AWAITING_ACCEPTANCE')
    return {
      workflowHref: `${href}#delivery`,
      nextAction:
        delivery.state === 'PROPOSED' ? 'View delivery proposal' : 'View acceptance request',
      actionReason:
        delivery.state === 'PROPOSED'
          ? `Delivery revision ${delivery.revision} is awaiting agreement from ${delivery.reviewerName}.`
          : `Delivery revision ${delivery.revision} is awaiting acceptance from ${delivery.reviewerName}.`,
    };
  if (status === 'WAITING_FOR_CLIENT')
    return {
      workflowHref: href,
      nextAction: 'Open ticket',
      actionReason: 'The ticket is marked as waiting for the client.',
    };
  if (scope?.state === 'REJECTED')
    return {
      workflowHref: `${href}#scope`,
      nextAction: 'Review rejected scope',
      actionReason: `Scope revision ${scope.revision} was rejected; the ticket remains unresolved.`,
    };
  return {
    workflowHref: delivery ? `${href}#delivery` : href,
    nextAction: delivery ? 'View delivery' : 'Open ticket',
    actionReason: 'The ticket is unresolved with no pending client decision or requested changes.',
  };
}

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
  if (user.role === 'CLIENT' && query.workflow) {
    throw new ApiError(403, 'FORBIDDEN', 'Personal workflow filters are internal only.');
  }
  if (user.role === 'CLIENT' && (query.assignment || query.assignedToId)) {
    throw new ApiError(403, 'FORBIDDEN', 'Team assignment filters are internal only.');
  }
  if (query.workflow && query.assignment !== 'mine') {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Workflow filters require assignment=mine.');
  }
  const period = query.resolvedMonth ? monthBounds(query.resolvedMonth) : null;
  const search = query.search?.replace(/[\\%_]/g, '\\$&');
  return and(
    organisationScope(user),
    query.workflow ? eq(workflowLane, query.workflow) : undefined,
    query.status === 'UNRESOLVED'
      ? inArray(tickets.status, [...unresolvedStatuses])
      : query.status
        ? eq(tickets.status, query.status)
        : undefined,
    query.priority ? eq(tickets.priority, query.priority) : undefined,
    query.category ? eq(tickets.category, query.category) : undefined,
    query.projectId ? eq(tickets.projectId, query.projectId) : undefined,
    query.clientId ? eq(projects.clientId, query.clientId) : undefined,
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
          ...(query.workflow ? { scope: latestScope, delivery: latestDelivery } : {}),
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
        items: rows.map(({ ticket, scope, delivery, ...relations }) => ({
          ...ticket,
          ...relations,
          ...(query.workflow
            ? {
                workflow: query.workflow,
                currentWorkflow: { scope: scope ?? null, delivery: delivery ?? null },
                ...workflowAction(ticket.id, scope ?? null, delivery ?? null, ticket.status),
              }
            : {}),
        })),
        total: total?.count ?? 0,
        page: query.page,
        limit: query.limit,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
