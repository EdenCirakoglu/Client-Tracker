import { and, desc, eq, getTableColumns, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import {
  clients,
  deliveryEvents,
  deliveryRevisions,
  progressSummaries,
  projects,
  releases,
  scopeProposals,
  ticketEvents,
  tickets,
  users,
  type SummaryItem,
  type SummarySection,
} from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';
import { requireInternal, requireCurrentWorkflowActor } from './workflow-access';
import { deliveryDateBounds } from './delivery-plan.service';
import { enqueueWorkflowMail } from './mail-payload';

export const publishSummaryBody = z
  .object({ recipientIds: z.array(z.string().uuid()).max(50).default([]) })
  .strict();

export async function summaryRecipients(user: AuthenticatedUser, id: string) {
  requireInternal(user);
  return db.transaction(async (tx) => {
    await requireCurrentWorkflowActor(tx, user);
    const [summary] = await tx.select().from(progressSummaries).where(eq(progressSummaries.id, id));
    if (!summary) throw new ApiError(404, 'SUMMARY_NOT_FOUND', 'Summary was not found.');
    return tx
      .select({
        id: users.id,
        name: users.name,
        workflowNotifications: users.workflowNotifications,
      })
      .from(users)
      .where(
        and(
          eq(users.clientId, summary.clientId),
          eq(users.role, 'CLIENT'),
          eq(users.accountStatus, 'ACTIVE'),
        ),
      )
      .orderBy(users.name, users.id)
      .limit(100);
  });
}

const linkedNote = z
  .object({ ticketId: z.string().uuid(), note: z.string().trim().min(10).max(2000) })
  .strict();
const statusLabels = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_FOR_CLIENT: 'Waiting for client',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
};
export const summaryBody = z
  .object({
    clientId: z.string().uuid(),
    weekStart: z.string().date(),
    upcoming: z.array(linkedNote).max(20).default([]),
    blocked: z.array(linkedNote).max(20).default([]),
  })
  .strict()
  .refine((data) => new Date(`${data.weekStart}T00:00:00Z`).getTime() <= Date.now(), {
    path: ['weekStart'],
    message: 'The reporting period cannot start in the future.',
  });
export const summaryListQuery = z
  .object({ page: z.coerce.number().int().min(1).max(10000).default(1) })
  .strict();
function section(key: string, label: string, items: SummaryItem[]): SummarySection {
  return { key, label, items: items.slice(0, 100), truncated: items.length > 100 };
}

export async function generateSummary(user: AuthenticatedUser, data: z.infer<typeof summaryBody>) {
  requireInternal(user);
  return db.transaction(
    async (tx) => {
      await requireCurrentWorkflowActor(tx, user);
      const [client] = await tx.select().from(clients).where(eq(clients.id, data.clientId));
      if (!client) throw new ApiError(404, 'CLIENT_NOT_FOUND', 'Client was not found.');
      const start = new Date(`${data.weekStart}T00:00:00Z`);
      const end = new Date(start.getTime() + 7 * 86400000);
      const scope = eq(projects.clientId, client.id);
      const completions = await tx
        .select({
          id: tickets.id,
          title: tickets.title,
          status: tickets.status,
          when: ticketEvents.createdAt,
        })
        .from(ticketEvents)
        .innerJoin(tickets, eq(ticketEvents.ticketId, tickets.id))
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(
          and(
            scope,
            eq(ticketEvents.eventType, 'STATUS_CHANGED'),
            inArray(ticketEvents.toValue, ['RESOLVED', 'CLOSED']),
            gte(ticketEvents.createdAt, start),
            lt(ticketEvents.createdAt, end),
          ),
        )
        .orderBy(desc(ticketEvents.createdAt), ticketEvents.id)
        .limit(101);
      const accepted = await tx
        .select({ id: tickets.id, title: tickets.title, when: deliveryEvents.createdAt })
        .from(deliveryEvents)
        .innerJoin(deliveryRevisions, eq(deliveryEvents.revisionId, deliveryRevisions.id))
        .innerJoin(tickets, eq(deliveryRevisions.ticketId, tickets.id))
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(
          and(
            scope,
            eq(deliveryEvents.action, 'ACCEPTED'),
            gte(deliveryEvents.createdAt, start),
            lt(deliveryEvents.createdAt, end),
          ),
        )
        .orderBy(desc(deliveryEvents.createdAt), deliveryEvents.id)
        .limit(101);
      const versions = await tx
        .select({
          id: releases.id,
          version: releases.version,
          title: releases.title,
          notes: releases.notes,
          when: releases.createdAt,
        })
        .from(releases)
        .innerJoin(projects, eq(releases.projectId, projects.id))
        .where(and(scope, gte(releases.createdAt, start), lt(releases.createdAt, end)))
        .orderBy(desc(releases.createdAt), releases.id)
        .limit(101);
      const waiting = await tx
        .select({ id: tickets.id, title: tickets.title })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(and(scope, eq(tickets.status, 'WAITING_FOR_CLIENT')))
        .orderBy(tickets.createdAt, tickets.id)
        .limit(101);
      const pendingScopes = await tx
        .select({
          id: tickets.id,
          title: tickets.title,
          revision: scopeProposals.revision,
          approver: scopeProposals.approverName,
        })
        .from(scopeProposals)
        .innerJoin(tickets, eq(scopeProposals.ticketId, tickets.id))
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(
          and(
            scope,
            eq(scopeProposals.state, 'PROPOSED'),
            sql`${scopeProposals.revision} = (select max(s.revision) from scope_proposals s where s.ticket_id = ${tickets.id})`,
          ),
        )
        .orderBy(scopeProposals.createdAt, scopeProposals.id)
        .limit(101);
      const pendingDelivery = await tx
        .select({
          id: tickets.id,
          title: tickets.title,
          state: deliveryRevisions.state,
          reviewer: deliveryRevisions.reviewerName,
        })
        .from(deliveryRevisions)
        .innerJoin(tickets, eq(deliveryRevisions.ticketId, tickets.id))
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(
          and(
            scope,
            inArray(deliveryRevisions.state, ['PROPOSED', 'AWAITING_ACCEPTANCE']),
            sql`${deliveryRevisions.revision} = (select max(d.revision) from delivery_revisions d where d.ticket_id = ${tickets.id})`,
          ),
        )
        .orderBy(deliveryRevisions.createdAt, deliveryRevisions.id)
        .limit(101);
      const notes = [...data.upcoming, ...data.blocked];
      const { today, through } = deliveryDateBounds();
      const commitments: SummarySection[] = [];
      for (const overdue of [true, false]) {
        const rows = await tx
          .select({
            id: tickets.id,
            title: tickets.title,
            target: deliveryRevisions.targetDate,
            owner: deliveryRevisions.ownerName,
          })
          .from(deliveryRevisions)
          .innerJoin(tickets, eq(deliveryRevisions.ticketId, tickets.id))
          .innerJoin(projects, eq(tickets.projectId, projects.id))
          .where(
            and(
              scope,
              eq(deliveryRevisions.state, 'AGREED'),
              sql`${deliveryRevisions.revision} = (select max(d.revision) from delivery_revisions d where d.ticket_id = ${tickets.id})`,
              overdue
                ? lt(deliveryRevisions.targetDate, today)
                : and(
                    gte(deliveryRevisions.targetDate, today),
                    lt(deliveryRevisions.targetDate, through),
                  ),
            ),
          )
          .orderBy(deliveryRevisions.targetDate, deliveryRevisions.id)
          .limit(101);
        commitments.push(
          section(
            overdue ? 'overdue-delivery' : 'upcoming-delivery',
            overdue
              ? `Agreed delivery targets before ${today} (UTC), not yet delivered at preparation time`
              : `Agreed delivery targets from ${today} up to ${through} (UTC, exclusive)`,
            rows.map((row) => ({
              title: row.title,
              href: `/tickets/${row.id}#delivery`,
              detail: `Target: ${row.target}. Owner: ${row.owner ?? 'Not recorded'}.`,
              recordedAt: null,
            })),
          ),
        );
      }
      const linkedTickets = notes.length
        ? await tx
            .select({ id: tickets.id, title: tickets.title })
            .from(tickets)
            .innerJoin(projects, eq(tickets.projectId, projects.id))
            .where(
              and(
                scope,
                inArray(
                  tickets.id,
                  notes.map((n) => n.ticketId),
                ),
              ),
            )
        : [];
      const names = new Map(linkedTickets.map((t) => [t.id, t.title]));
      if (notes.some((n) => !names.has(n.ticketId)))
        throw new ApiError(
          400,
          'INVALID_SUMMARY_RECORD',
          'Every commitment and blocker must link to a ticket in this organisation.',
        );
      const linked = (entries: typeof notes) =>
        entries.map((n) => ({
          title: names.get(n.ticketId)!,
          href: `/tickets/${n.ticketId}`,
          detail: n.note,
          recordedAt: null,
        }));
      const sections = [
        section(
          'resolved',
          'Resolution recorded during this period',
          completions.map((t) => ({
            title: t.title,
            href: `/tickets/${t.id}`,
            detail: `Current ticket status: ${statusLabels[t.status]}. Resolution is not client acceptance.`,
            recordedAt: t.when.toISOString(),
          })),
        ),
        section(
          'accepted',
          'Client acceptance recorded during this period',
          accepted.map((t) => ({
            title: t.title,
            href: `/tickets/${t.id}`,
            detail: 'Client acceptance recorded.',
            recordedAt: t.when.toISOString(),
          })),
        ),
        section(
          'releases',
          'Releases added during this period',
          versions.map((r) => ({
            title: `${r.version} - ${r.title}`,
            href: `/releases#release-${r.id}`,
            detail: r.notes ?? '',
            recordedAt: r.when.toISOString(),
          })),
        ),
        section(
          'waiting',
          'Awaiting your reply at preparation time',
          waiting.map((t) => ({
            title: t.title,
            href: `/tickets/${t.id}`,
            detail: 'Your reply is needed.',
            recordedAt: null,
          })),
        ),
        section('upcoming', 'Upcoming commitments recorded by the team', linked(data.upcoming)),
        ...commitments,
        section('blocked', 'Blocked work and recorded reasons', linked(data.blocked)),
        section(
          'approvals',
          'Scope approvals needed at preparation time',
          pendingScopes.map((s) => ({
            title: s.title,
            href: `/tickets/${s.id}`,
            detail: `Scope revision ${s.revision}: awaiting ${s.approver}.`,
            recordedAt: null,
          })),
        ),
        section(
          'confirmation',
          'Outcome agreement or acceptance needed at preparation time',
          pendingDelivery.map((d) => ({
            title: d.title,
            href: `/tickets/${d.id}`,
            detail: `${d.state === 'PROPOSED' ? 'Outcome agreement' : 'Delivery acceptance'}: awaiting ${d.reviewer}.`,
            recordedAt: null,
          })),
        ),
      ];
      const [summary] = await tx
        .insert(progressSummaries)
        .values({
          clientId: client.id,
          clientName: client.name,
          periodStart: start,
          periodEnd: end,
          sections,
          createdBy: user.name,
        })
        .returning();
      return summary!;
    },
    { isolationLevel: 'repeatable read' },
  );
}

function visibleTo(user: AuthenticatedUser) {
  return user.role === 'CLIENT'
    ? and(
        eq(progressSummaries.clientId, user.clientId ?? '00000000-0000-0000-0000-000000000000'),
        isNotNull(progressSummaries.publishedAt),
      )
    : undefined;
}
export async function listSummaries(user: AuthenticatedUser, page: number) {
  const { sections: _sections, ...columns } = getTableColumns(progressSummaries);
  const rows = await db
    .select(columns)
    .from(progressSummaries)
    .where(visibleTo(user))
    .orderBy(desc(progressSummaries.createdAt), progressSummaries.id)
    .limit(21)
    .offset((page - 1) * 20);
  return {
    items: rows.slice(0, 20),
    page,
    hasMore: rows.length > 20,
  };
}
export async function getSummary(user: AuthenticatedUser, id: string) {
  const [summary] = await db
    .select()
    .from(progressSummaries)
    .where(and(eq(progressSummaries.id, id), visibleTo(user)));
  if (!summary) throw new ApiError(404, 'SUMMARY_NOT_FOUND', 'Summary was not found.');
  return summary;
}
export async function publishSummary(
  user: AuthenticatedUser,
  id: string,
  recipientIds: string[] = [],
) {
  requireInternal(user);
  const notifications = await db.transaction(async (tx) => {
    await requireCurrentWorkflowActor(tx, user);
    const [summary] = await tx
      .select()
      .from(progressSummaries)
      .where(eq(progressSummaries.id, id))
      .for('update');
    if (!summary) throw new ApiError(404, 'SUMMARY_NOT_FOUND', 'Summary was not found.');
    const selected = [...new Set(recipientIds)];
    if (selected.length > 50)
      throw new ApiError(400, 'INVALID_RECIPIENTS', 'Choose up to 50 contacts.');
    const recipients = selected.length
      ? await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              inArray(users.id, selected),
              eq(users.clientId, summary.clientId),
              eq(users.role, 'CLIENT'),
              eq(users.accountStatus, 'ACTIVE'),
              eq(users.workflowNotifications, true),
            ),
          )
          .for('share')
      : [];
    if (recipients.length !== selected.length)
      throw new ApiError(
        400,
        'INVALID_RECIPIENTS',
        'No notices queued; publication unchanged. Refresh and choose active contacts who receive workflow emails from this organisation.',
      );
    if (!summary.publishedAt)
      await tx
        .update(progressSummaries)
        .set({ publishedAt: new Date(), publishedBy: user.name })
        .where(eq(progressSummaries.id, id));
    const outcomes: { recipientId: string; outcome: 'QUEUED' | 'ALREADY_REQUESTED' }[] = [];
    for (const recipient of recipients) {
      const outcome = await enqueueWorkflowMail(tx, {
        kind: 'WORKFLOW',
        event: 'SUMMARY_PUBLISHED',
        recipientId: recipient.id,
        clientId: summary.clientId,
        recordId: id,
        ticketId: null,
        expectedState: 'PUBLISHED',
      });
      outcomes.push({ recipientId: recipient.id, outcome });
    }
    return {
      queued: outcomes.filter((item) => item.outcome === 'QUEUED').length,
      alreadyRequested: outcomes.filter((item) => item.outcome === 'ALREADY_REQUESTED').length,
      notQueued: 0,
      recipients: outcomes,
    };
  });
  return { ...(await getSummary(user, id)), notifications };
}
