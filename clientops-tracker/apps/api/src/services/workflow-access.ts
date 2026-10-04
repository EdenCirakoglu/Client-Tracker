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

// Call after locking the actor. SHARE keeps project ownership stable until commit.
export async function lockProjectForUser(
  tx: WorkflowTransaction,
  user: AuthenticatedUser,
  projectId: string,
) {
  const [project] = await tx
    .select()
    .from(projects)
    .where(
      and(
        eq(projects.id, projectId),
        user.role === 'CLIENT'
          ? eq(projects.clientId, user.clientId ?? '00000000-0000-0000-0000-000000000000')
          : undefined,
      ),
    )
    .for('share');
  return project;
}

// Existing-ticket mutations lock actor, ticket, then project before authorizing a write.
export async function accessibleTicket(
  tx: WorkflowTransaction,
  user: AuthenticatedUser,
  ticketId: string,
) {
  await requireCurrentWorkflowActor(tx, user);
  const [ticket] = await tx.select().from(tickets).where(eq(tickets.id, ticketId)).for('update');
  if (!ticket) throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  const project = await lockProjectForUser(tx, user, ticket.projectId);
  if (!project) throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  return { ticket, project };
}
export function requireInternal(user: AuthenticatedUser) {
  if (user.role === 'CLIENT')
    throw new ApiError(403, 'FORBIDDEN', 'Only internal staff can perform this action.');
}
