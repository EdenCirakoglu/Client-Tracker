import { and, eq, sql, type SQL } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { clients, projects, tickets } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';
import { organisationScope } from './queue.service';

export const deliveryViews = [
  'followup',
  'overdue',
  'upcoming',
  'agreement',
  'acceptance',
  'changes',
  'scope',
  'all',
] as const;
export const deliveryPlanQuery = z
  .object({
    view: z.enum(deliveryViews).default('followup'),
    projectId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export function deliveryDateBounds(now = new Date()) {
  const today = now.toISOString().slice(0, 10);
  const through = new Date(new Date(`${today}T00:00:00Z`).getTime() + 7 * 86400000)
    .toISOString()
    .slice(0, 10);
  return { today, through };
}

interface DeliveryPlanRow extends Record<string, unknown> {
  id: string;
  source: 'delivery' | 'scope';
  ticketId: string;
  title: string;
  projectId: string;
  projectName: string;
  clientName: string;
  revision: number;
  state: string;
  targetDate: string | null;
  ownerName: string | null;
  reviewerId: string;
  reviewerName: string;
  releaseVersion: string | null;
  createdAt: Date;
}

export async function getDeliveryPlan(
  user: AuthenticatedUser,
  query: z.infer<typeof deliveryPlanQuery>,
) {
  const snapshotTime = new Date();
  const { today, through } = deliveryDateBounds(snapshotTime);
  return db.transaction(
    async (tx) => {
      if (query.projectId) {
        const [project] = await tx
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.id, query.projectId), organisationScope(user)));
        if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
      }
      // Both branches share the tenant boundary. Only latest revisions and public workflow fields enter this queue.
      const scope = and(
        organisationScope(user),
        query.projectId ? eq(projects.id, query.projectId) : undefined,
      );
      const records = sql`with work as (
      select d.id, 'delivery'::text as source, ${tickets.id} as "ticketId", ${tickets.title} as title,
        ${projects.id} as "projectId", ${projects.name} as "projectName", ${clients.name} as "clientName",
        d.revision, d.state::text as state, to_char(d.target_date, 'YYYY-MM-DD') as "targetDate", d.owner_name as "ownerName",
        d.reviewer_id as "reviewerId", d.reviewer_name as "reviewerName", d.release_version as "releaseVersion", d.created_at as "createdAt"
      from delivery_revisions d join ${tickets} on ${tickets.id} = d.ticket_id
      join ${projects} on ${projects.id} = ${tickets.projectId} join ${clients} on ${clients.id} = ${projects.clientId}
      where ${scope} and d.revision = (select max(newer.revision) from delivery_revisions newer where newer.ticket_id = d.ticket_id)
      union all
      select s.id, 'scope'::text, ${tickets.id}, ${tickets.title}, ${projects.id}, ${projects.name}, ${clients.name},
        s.revision, s.state::text, null::text, null::text, s.approver_id, s.approver_name, null::text, s.created_at
      from scope_proposals s join ${tickets} on ${tickets.id} = s.ticket_id
      join ${projects} on ${projects.id} = ${tickets.projectId} join ${clients} on ${clients.id} = ${projects.clientId}
      where ${scope} and s.state = 'PROPOSED' and s.revision = (select max(newer.revision) from scope_proposals newer where newer.ticket_id = s.ticket_id)
    )`;
      const predicates: Record<(typeof deliveryViews)[number], SQL> = {
        all: sql`true`,
        followup: sql`state <> 'ACCEPTED'`,
        overdue: sql`source = 'delivery' and state = 'AGREED' and "targetDate" < ${today}`,
        upcoming: sql`source = 'delivery' and state = 'AGREED' and "targetDate" >= ${today} and "targetDate" < ${through}`,
        agreement: sql`source = 'delivery' and state = 'PROPOSED'`,
        acceptance: sql`source = 'delivery' and state = 'AWAITING_ACCEPTANCE'`,
        changes: sql`source = 'delivery' and state = 'CHANGES_REQUESTED'`,
        scope: sql`source = 'scope'`,
      };
      const countsResult = await tx.execute<Record<(typeof deliveryViews)[number], number>>(
        sql`${records} select ${sql.join(
          deliveryViews.map(
            (view) =>
              sql`count(*) filter (where ${predicates[view]})::int as ${sql.identifier(view)}`,
          ),
          sql`, `,
        )} from work`,
      );
      const counts = countsResult.rows[0]!;
      const result =
        await tx.execute<DeliveryPlanRow>(sql`${records} select * from work where ${predicates[query.view]}
      order by case when ${user.role === 'CLIENT'} and "reviewerId" = ${user.id} and (source = 'scope' or state in ('PROPOSED', 'AWAITING_ACCEPTANCE')) then 0 else 1 end,
        case when ${predicates.overdue} then 0 when state = 'CHANGES_REQUESTED' then 1
        when state = 'AWAITING_ACCEPTANCE' then 2 when state = 'PROPOSED' then 3 else 4 end,
        "targetDate" asc nulls last, "createdAt" asc, id asc
      limit ${query.limit} offset ${(query.page - 1) * query.limit}`);
      return {
        items: result.rows.map((row) => {
          const decision =
            row.source === 'scope' || ['PROPOSED', 'AWAITING_ACCEPTANCE'].includes(row.state);
          const yourDecision = decision && user.role === 'CLIENT' && row.reviewerId === user.id;
          const reason =
            row.source === 'scope'
              ? `Scope revision ${row.revision} awaiting ${row.reviewerName}`
              : row.state === 'AWAITING_ACCEPTANCE'
                ? `Release ${row.releaseVersion}: awaiting ${row.reviewerName}`
                : row.state === 'PROPOSED'
                  ? `Outcome agreement needed from ${row.reviewerName}`
                  : row.state === 'CHANGES_REQUESTED'
                    ? 'Client requested changes'
                    : row.state === 'ACCEPTED'
                      ? 'Accepted by client'
                      : row.targetDate && row.targetDate < today
                        ? 'Agreed target date has passed'
                        : row.targetDate && row.targetDate < through
                          ? 'Agreed target date within the next seven UTC days'
                          : 'Outcome agreed; delivery not yet recorded';
          return { ...row, reason, yourDecision, href: `/tickets/${row.ticketId}#${row.source}` };
        }),
        counts,
        total: counts[query.view],
        page: query.page,
        limit: query.limit,
        asOf: snapshotTime.toISOString(),
        today,
        through,
      };
    },
    { isolationLevel: 'repeatable read', accessMode: 'read only' },
  );
}
