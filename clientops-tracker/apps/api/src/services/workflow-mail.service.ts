import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { env } from '../config/env';
import {
  deliveryRevisions,
  mailOutbox,
  progressSummaries,
  projects,
  scopeProposals,
  tickets,
  users,
} from '../db/schema';
import type { WorkflowMailPayload } from './mail-payload';
import { sendWorkflowMail } from './mail.service';

type Job = typeof mailOutbox.$inferSelect;
export type WorkflowSender = typeof sendWorkflowMail;
export type DeliveryOutcome = 'DELIVERED' | 'RECIPIENT_UNAVAILABLE' | 'OPTED_OUT' | 'SUPERSEDED';

export async function deliverWorkflowMail(
  job: Job,
  payload: WorkflowMailPayload,
  send: WorkflowSender = sendWorkflowMail,
): Promise<DeliveryOutcome> {
  return db.transaction(async (tx) => {
    // Keep authorization stable during the bounded SMTP attempt; never hold a connection indefinitely.
    await tx.execute(sql`SET LOCAL idle_in_transaction_session_timeout = '40s'`);
    const [recipient] = await tx
      .select()
      .from(users)
      .where(eq(users.id, payload.recipientId))
      .for('share');
    if (!recipient || recipient.accountStatus !== 'ACTIVE' || (!env.DEMO_MODE && recipient.isDemo))
      return 'RECIPIENT_UNAVAILABLE';
    if (!recipient.workflowNotifications) return 'OPTED_OUT';
    const clientMessage = !['SCOPE_DECISION', 'DELIVERY_DECISION'].includes(payload.event);
    if (
      clientMessage
        ? recipient.role !== 'CLIENT' || recipient.clientId !== payload.clientId
        : !['ADMIN', 'DEVELOPER'].includes(recipient.role)
    )
      return 'RECIPIENT_UNAVAILABLE';

    let href: string;
    if (payload.event === 'SUMMARY_PUBLISHED') {
      const [summary] = await tx
        .select()
        .from(progressSummaries)
        .where(eq(progressSummaries.id, payload.recordId))
        .for('share');
      if (!summary?.publishedAt || summary.clientId !== payload.clientId) return 'SUPERSEDED';
      href = `/summaries/${summary.id}`;
    } else {
      if (!payload.ticketId) return 'SUPERSEDED';
      const [ticket] = await tx
        .select()
        .from(tickets)
        .where(eq(tickets.id, payload.ticketId))
        .for('share');
      if (!ticket) return 'SUPERSEDED';
      const [project] = await tx
        .select()
        .from(projects)
        .where(eq(projects.id, ticket.projectId))
        .for('share');
      if (!project || project.clientId !== payload.clientId) return 'RECIPIENT_UNAVAILABLE';
      if (payload.event.startsWith('SCOPE_')) {
        const [scope] = await tx
          .select()
          .from(scopeProposals)
          .where(eq(scopeProposals.ticketId, ticket.id))
          .orderBy(desc(scopeProposals.revision))
          .limit(1)
          .for('share');
        if (!scope || scope.id !== payload.recordId || scope.state !== payload.expectedState)
          return 'SUPERSEDED';
        if ((clientMessage ? scope.approverId : scope.proposedById) !== recipient.id)
          return 'RECIPIENT_UNAVAILABLE';
        href = `/tickets/${ticket.id}#scope`;
      } else {
        const [delivery] = await tx
          .select()
          .from(deliveryRevisions)
          .where(eq(deliveryRevisions.ticketId, ticket.id))
          .orderBy(desc(deliveryRevisions.revision))
          .limit(1)
          .for('share');
        if (
          !delivery ||
          delivery.id !== payload.recordId ||
          delivery.state !== payload.expectedState
        )
          return 'SUPERSEDED';
        if ((clientMessage ? delivery.reviewerId : delivery.ownerId) !== recipient.id)
          return 'RECIPIENT_UNAVAILABLE';
        href = `/tickets/${ticket.id}#delivery`;
      }
    }
    const [lease] = await tx
      .select({ id: mailOutbox.id })
      .from(mailOutbox)
      .where(
        and(
          eq(mailOutbox.id, job.id),
          eq(mailOutbox.status, 'SENDING'),
          eq(mailOutbox.leaseId, job.leaseId!),
          sql`${mailOutbox.leaseUntil} > clock_timestamp()`,
          sql`${mailOutbox.expiresAt} > clock_timestamp()`,
        ),
      )
      .for('update');
    if (!lease) return 'SUPERSEDED';
    await send(recipient.email, href, payload.event);
    return 'DELIVERED';
  });
}
