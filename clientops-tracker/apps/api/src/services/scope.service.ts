import { and, desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { scopeProposals, users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';
import { accessibleTicket, requireInternal, type WorkflowTransaction } from './workflow-access';

export const scopeProposalBody = z
  .object({
    expectedRevision: z.number().int().min(0).max(99),
    approverId: z.string().uuid(),
    scope: z.string().trim().min(10).max(6000),
    exclusions: z.string().trim().min(1).max(4000),
    estimate: z.string().trim().min(1).max(500),
    deliveryImplications: z.string().trim().min(10).max(4000),
    externalReference: z.string().trim().max(255).default(''),
  })
  .strict();
export const scopeDecisionBody = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED', 'CHANGES_REQUESTED']),
    feedback: z.string().trim().max(4000).default(''),
  })
  .strict()
  .refine((data) => data.decision === 'APPROVED' || data.feedback.length >= 10, {
    path: ['feedback'],
    message: 'Explain the requested changes or rejection (at least 10 characters).',
  });
async function latest(tx: WorkflowTransaction, ticketId: string) {
  const [proposal] = await tx
    .select()
    .from(scopeProposals)
    .where(eq(scopeProposals.ticketId, ticketId))
    .orderBy(desc(scopeProposals.revision))
    .limit(1);
  return proposal;
}
export async function getScopeProposals(user: AuthenticatedUser, ticketId: string) {
  return db.transaction(async (tx) => {
    await accessibleTicket(tx, user, ticketId);
    return tx
      .select()
      .from(scopeProposals)
      .where(eq(scopeProposals.ticketId, ticketId))
      .orderBy(desc(scopeProposals.revision))
      .limit(100);
  });
}
export async function proposeScope(
  user: AuthenticatedUser,
  ticketId: string,
  data: z.infer<typeof scopeProposalBody>,
) {
  requireInternal(user);
  await db.transaction(async (tx) => {
    const { ticket, project } = await accessibleTicket(tx, user, ticketId);
    if (ticket.category !== 'FEATURE_REQUEST')
      throw new ApiError(400, 'NOT_FEATURE_REQUEST', 'Scope proposals belong to feature requests.');
    const previous = await latest(tx, ticketId);
    if ((previous?.revision ?? 0) !== data.expectedRevision)
      throw new ApiError(
        409,
        'STALE_REVISION',
        'The scope changed. Refresh before creating a revision.',
      );
    const [approver] = await tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.id, data.approverId),
          eq(users.clientId, project.clientId),
          eq(users.role, 'CLIENT'),
          eq(users.accountStatus, 'ACTIVE'),
        ),
      )
      .for('share');
    if (!approver)
      throw new ApiError(
        400,
        'INVALID_APPROVER',
        'Choose an active client approver from this organisation.',
      );
    await tx.insert(scopeProposals).values({
      ticketId,
      revision: data.expectedRevision + 1,
      scope: data.scope,
      exclusions: data.exclusions,
      estimate: data.estimate,
      deliveryImplications: data.deliveryImplications,
      externalReference: data.externalReference || null,
      approverId: approver.id,
      approverName: approver.name,
      proposedBy: user.name,
    });
  });
  return getScopeProposals(user, ticketId);
}
export async function decideScope(
  user: AuthenticatedUser,
  ticketId: string,
  proposalId: string,
  data: z.infer<typeof scopeDecisionBody>,
) {
  if (user.role !== 'CLIENT')
    throw new ApiError(403, 'FORBIDDEN', 'Only the designated client approver can decide.');
  await db.transaction(async (tx) => {
    await accessibleTicket(tx, user, ticketId);
    const current = await latest(tx, ticketId);
    if (!current || current.id !== proposalId)
      throw new ApiError(409, 'STALE_REVISION', 'Review the latest scope revision.');
    if (current.approverId !== user.id)
      throw new ApiError(403, 'NOT_APPROVER', 'Only the designated client approver can decide.');
    if (current.state === data.decision && current.feedback === (data.feedback || null)) return;
    if (current.state !== 'PROPOSED')
      throw new ApiError(
        409,
        'ALREADY_DECIDED',
        'This revision already has a decision. Staff must create a new revision to change it.',
      );
    await tx
      .update(scopeProposals)
      .set({
        state: data.decision,
        feedback: data.feedback || null,
        decidedBy: user.name,
        decidedAt: new Date(),
      })
      .where(eq(scopeProposals.id, proposalId));
  });
  return getScopeProposals(user, ticketId);
}
