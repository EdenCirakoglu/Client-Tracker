import { sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import type { AuthenticatedUser } from '../types/auth';

export const activityQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).max(10000).default(1),
    limit: z.coerce.number().int().min(1).max(30).default(6),
    before: z.string().datetime().optional(),
    kind: z.enum(['ticket', 'release']).optional(),
  })
  .strict();
export interface ActivityItem extends Record<string, unknown> {
  id: string;
  recordId: string;
  title: string;
  project: string;
  actor: string | null;
  action: string;
  createdAt: string;
  kind: 'ticket' | 'release';
}

export async function getDashboardActivity(
  user: AuthenticatedUser,
  query: z.infer<typeof activityQuerySchema>,
) {
  const before = query.before ?? new Date().toISOString();
  const scope = user.role === 'CLIENT' ? sql`p.client_id = ${user.clientId}::uuid` : sql`true`;
  // Public comment timestamps come from the comments themselves, never a hidden event or ticket.updated_at.
  // Explicit allowlists fail closed for future internal event types. No internal previews are returned.
  const eventTypes =
    user.role === 'CLIENT'
      ? sql`('TICKET_CREATED', 'STATUS_CHANGED')`
      : sql`('TICKET_CREATED', 'STATUS_CHANGED', 'PRIORITY_CHANGED', 'CATEGORY_CHANGED', 'ASSIGNEE_CHANGED', 'TRIAGE_SUGGESTION_APPLIED')`;
  const result = await db.execute<ActivityItem>(sql`
    select * from (
      select 'event:' || e.id as id, t.id as "recordId", t.title, p.name as project,
        u.name as actor, e.event_type as action, e.created_at as "createdAt", 'ticket' as kind
      from ticket_events e join tickets t on t.id = e.ticket_id join projects p on p.id = t.project_id
      left join users u on u.id = e.actor_id
      where ${scope} and e.event_type in ${eventTypes} and e.created_at <= ${before}::timestamptz
      union all
      select 'comment:' || c.id, t.id, t.title, p.name, u.name,
        case when c.is_internal then 'INTERNAL_COMMENT' else 'PUBLIC_COMMENT' end, c.created_at, 'ticket'
      from ticket_comments c join tickets t on t.id = c.ticket_id join projects p on p.id = t.project_id
      join users u on u.id = c.author_id
      where ${scope} and ${user.role === 'CLIENT' ? sql`c.is_internal = false` : sql`true`}
        and c.created_at <= ${before}::timestamptz
      union all
      select 'release:' || r.id, r.id, r.version || ' - ' || r.title, p.name, null, 'RELEASE_ADDED', r.created_at, 'release'
      from releases r join projects p on p.id = r.project_id
      where ${scope} and r.created_at <= ${before}::timestamptz
    ) activity where ${query.kind ? sql`kind = ${query.kind}` : sql`true`}
    order by "createdAt" desc, id desc limit ${query.limit + 1} offset ${(query.page - 1) * query.limit}
  `);
  return {
    items: result.rows.slice(0, query.limit),
    hasMore: result.rows.length > query.limit,
    page: query.page,
    limit: query.limit,
    before,
  };
}
