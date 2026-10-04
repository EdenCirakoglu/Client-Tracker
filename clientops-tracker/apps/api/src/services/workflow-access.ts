import { and, eq } from 'drizzle-orm';
import type { db } from '../db/client';
import { projects, tickets, users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';

export type WorkflowTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function requireCurrentWorkflowActor(
  tx: WorkflowTransaction,
  user: AuthenticatedUser,
) {
  // Authentication precedes this transaction. Hold membership stable through the decision.
  const [current] = await tx.select().from(users).where(eq(users.id, user.id)).for('share');
  if (
    !current ||
    current.accountStatus !== 'ACTIVE' ||
    current.role !== user.role ||
    current.clientId !== user.clientId
  ) {
    throw new ApiError(403, 'ACCOUNT_CHANGED', 'Your account permissions changed. Sign in again.');
  }
}

// Delivery and scope revisions share the ticket lock, including with ordinary ticket updates.
export async function accessibleTicket(
  tx: WorkflowTransaction,
  user: AuthenticatedUser,
  ticketId: string,
) {
  await requireCurrentWorkflowActor(tx, user);
  const [row] = await tx
    .select({ ticket: tickets, project: projects })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(
      and(
        eq(tickets.id, ticketId),
        user.role === 'CLIENT'
          ? eq(projects.clientId, user.clientId ?? '00000000-0000-0000-0000-000000000000')
          : undefined,
      ),
    )
    .for('update', { of: tickets });
  if (!row) throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  return row;
}
export function requireInternal(user: AuthenticatedUser) {
  if (user.role === 'CLIENT')
    throw new ApiError(403, 'FORBIDDEN', 'Only internal staff can propose or deliver work.');
}
