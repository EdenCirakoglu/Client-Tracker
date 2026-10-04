import { and, desc, eq, inArray } from 'drizzle-orm';
import type { z } from 'zod';
import { db } from '../db/client';
import { deliveryEvents, deliveryRevisions, releases, tickets, users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { accessibleTicket, requireInternal as internal } from './workflow-access';
import { ApiError } from '../utils/http';
import type {
  deliveryDecisionBody,
  proposeOutcomeBody,
  requestAcceptanceBody,
} from '../validators/delivery';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function latest(tx: Transaction, ticketId: string) {
  const [record] = await tx
    .select()
    .from(deliveryRevisions)
    .where(eq(deliveryRevisions.ticketId, ticketId))
    .orderBy(desc(deliveryRevisions.revision))
    .limit(1);
  return record;
}

async function recordEvent(
  tx: Transaction,
  user: AuthenticatedUser,
  revisionId: string,
  action: string,
  feedback?: string,
) {
  await tx.insert(deliveryEvents).values({
    revisionId,
    actorId: user.id,
    actorName: user.name,
    action,
    feedback: feedback || null,
  });
}

export async function getDeliveryRecord(user: AuthenticatedUser, ticketId: string) {
  return db.transaction(async (tx) => {
    const { ticket, project } = await accessibleTicket(tx, user, ticketId);
    const revisions = await tx
      .select()
      .from(deliveryRevisions)
      .where(eq(deliveryRevisions.ticketId, ticketId))
      .orderBy(desc(deliveryRevisions.revision))
      .limit(100);
    const events = revisions.length
      ? await tx
          .select()
          .from(deliveryEvents)
          .where(
            inArray(
              deliveryEvents.revisionId,
              revisions.map((r) => r.id),
            ),
          )
          .orderBy(deliveryEvents.createdAt, deliveryEvents.id)
      : [];
    // Explicit projection: never spread a full ticket, user, comment or internal event into exports.
    return {
      ticketId: ticket.id,
      project: project.name,
      title: ticket.originalTitle ?? ticket.title,
      originalRequest: ticket.originalDescription ?? ticket.description,
      originalCaptured: ticket.originalDescription !== null,
      ticketStatus: ticket.status,
      revisions: revisions.map((r) => ({
        id: r.id,
        revision: r.revision,
        outcome: r.outcome,
        targetDate: r.targetDate,
        ownerId: r.ownerId,
        ownerName: r.ownerName,
        reviewerId: r.reviewerId,
        reviewerName: r.reviewerName,
        state: r.state,
        releaseVersion: r.releaseVersion,
        deliveryNotes: r.deliveryNotes,
        createdAt: r.createdAt,
        events: events
          .filter((e) => e.revisionId === r.id)
          .map((e) => ({
            id: e.id,
            actorName: e.actorName,
            action: e.action,
            feedback: e.feedback,
            createdAt: e.createdAt,
          })),
      })),
    };
  });
}

export async function listDeliveryReviewers(user: AuthenticatedUser, ticketId: string) {
  internal(user);
  return db.transaction(async (tx) => {
    const { project } = await accessibleTicket(tx, user, ticketId);
    return tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.clientId, project.clientId),
          eq(users.role, 'CLIENT'),
          eq(users.accountStatus, 'ACTIVE'),
        ),
      )
      .orderBy(users.name, users.id)
      .limit(100);
  });
}

export async function proposeOutcome(
  user: AuthenticatedUser,
  ticketId: string,
  data: z.infer<typeof proposeOutcomeBody>,
) {
  internal(user);
  await db.transaction(async (tx) => {
    const { ticket, project } = await accessibleTicket(tx, user, ticketId);
    const previous = await latest(tx, ticketId);
    if ((previous?.revision ?? 0) !== data.expectedRevision)
      throw new ApiError(
        409,
        'STALE_REVISION',
        'The delivery record changed. Refresh before proposing another outcome.',
      );
    const [reviewer] = await tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.id, data.reviewerId),
          eq(users.role, 'CLIENT'),
          eq(users.clientId, project.clientId),
          eq(users.accountStatus, 'ACTIVE'),
        ),
      )
      .for('share');
    if (!reviewer)
      throw new ApiError(
        400,
        'INVALID_REVIEWER',
        'Choose an active client reviewer from this project organisation.',
      );
    const [owner] = await tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(
        and(
          eq(users.id, data.ownerId ?? user.id),
          inArray(users.role, ['ADMIN', 'DEVELOPER']),
          eq(users.accountStatus, 'ACTIVE'),
        ),
      )
      .for('share');
    if (!owner)
      throw new ApiError(400, 'INVALID_OWNER', 'Choose an active internal delivery owner.');
    // Older tickets predate immutable request capture; preserve the earliest available text on first use.
    if (ticket.originalDescription === null)
      await tx
        .update(tickets)
        .set({ originalTitle: ticket.title, originalDescription: ticket.description })
        .where(eq(tickets.id, ticketId));
    const [record] = await tx
      .insert(deliveryRevisions)
      .values({
        ticketId,
        revision: data.expectedRevision + 1,
        outcome: data.outcome,
        targetDate: data.targetDate ?? null,
        ownerId: owner.id,
        ownerName: owner.name,
        reviewerId: reviewer.id,
        reviewerName: reviewer.name,
      })
      .returning();
    await recordEvent(tx, user, record!.id, 'PROPOSED');
  });
  return getDeliveryRecord(user, ticketId);
}

export async function requestAcceptance(
  user: AuthenticatedUser,
  ticketId: string,
  revisionId: string,
  data: z.infer<typeof requestAcceptanceBody>,
) {
  internal(user);
  await db.transaction(async (tx) => {
    const { ticket } = await accessibleTicket(tx, user, ticketId);
    const record = await latest(tx, ticketId);
    if (!record || record.id !== revisionId)
      throw new ApiError(409, 'STALE_REVISION', 'Only the latest outcome can be delivered.');
    if (
      record.state === 'AWAITING_ACCEPTANCE' &&
      record.releaseId === data.releaseId &&
      record.deliveryNotes === data.deliveryNotes
    )
      return;
    if (record.state !== 'AGREED')
      throw new ApiError(
        409,
        'OUTCOME_NOT_AGREED',
        'The client must agree this outcome before acceptance can be requested.',
      );
    const [release] = await tx
      .select()
      .from(releases)
      .where(and(eq(releases.id, data.releaseId), eq(releases.projectId, ticket.projectId)));
    if (!release)
      throw new ApiError(400, 'INVALID_RELEASE', 'Choose a release from this ticket project.');
    await tx
      .update(deliveryRevisions)
      .set({
        state: 'AWAITING_ACCEPTANCE',
        releaseId: release.id,
        releaseVersion: release.version,
        deliveryNotes: data.deliveryNotes,
      })
      .where(eq(deliveryRevisions.id, record.id));
    await recordEvent(tx, user, record.id, 'ACCEPTANCE_REQUESTED');
  });
  return getDeliveryRecord(user, ticketId);
}

export async function decideDelivery(
  user: AuthenticatedUser,
  ticketId: string,
  revisionId: string,
  data: z.infer<typeof deliveryDecisionBody>,
) {
  if (user.role !== 'CLIENT')
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Only the designated client reviewer can record a decision.',
    );
  await db.transaction(async (tx) => {
    await accessibleTicket(tx, user, ticketId);
    const record = await latest(tx, ticketId);
    if (!record || record.id !== revisionId)
      throw new ApiError(
        409,
        'STALE_REVISION',
        'This outcome has been superseded. Review the latest revision.',
      );
    if (record.reviewerId !== user.id)
      throw new ApiError(
        403,
        'NOT_REVIEWER',
        'Only the designated client reviewer can record a decision.',
      );
    const [existing] = await tx
      .select()
      .from(deliveryEvents)
      .where(
        and(eq(deliveryEvents.revisionId, revisionId), eq(deliveryEvents.action, data.decision)),
      );
    if (existing && existing.feedback === (data.feedback || null)) return;
    const allowed =
      (record.state === 'PROPOSED' && ['AGREED', 'CHANGES_REQUESTED'].includes(data.decision)) ||
      (record.state === 'AWAITING_ACCEPTANCE' &&
        ['ACCEPTED', 'CHANGES_REQUESTED'].includes(data.decision));
    if (!allowed)
      throw new ApiError(
        409,
        'INVALID_DECISION',
        'This decision is not available in the current delivery state.',
      );
    await tx
      .update(deliveryRevisions)
      .set({ state: data.decision })
      .where(eq(deliveryRevisions.id, revisionId));
    await recordEvent(tx, user, revisionId, data.decision, data.feedback);
  });
  return getDeliveryRecord(user, ticketId);
}

export async function exportDeliveryRecord(user: AuthenticatedUser, ticketId: string) {
  const record = await getDeliveryRecord(user, ticketId);
  return {
    filename: `delivery-${ticketId}.txt`,
    content: [
      'ClientOps Tracker - Delivery record',
      record.title,
      `Project: ${record.project}`,
      `Ticket status (separate from acceptance): ${record.ticketStatus}`,
      '\nOriginal request:',
      record.originalRequest,
      ...record.revisions.flatMap((r) => [
        `\nRevision ${r.revision}: ${r.state}${r !== record.revisions[0] ? ' (historical)' : ''}`,
        `Client reviewer: ${r.reviewerName}`,
        `Outcome: ${r.outcome}`,
        `Delivery owner: ${r.ownerName ?? 'Not recorded'}`,
        `Target date (UTC): ${r.targetDate ?? 'No target date'}`,
        `Release: ${r.releaseVersion ?? 'Not delivered'}`,
        `Delivery notes: ${r.deliveryNotes ?? 'Not recorded'}`,
        ...r.events.map(
          (e) =>
            `${e.createdAt.toISOString()} | ${e.actorName} | ${e.action}${e.feedback ? `\n${e.feedback}` : ''}`,
        ),
      ]),
      '\nRelease publication, ticket resolution and client acceptance are separate facts.',
    ].join('\n'),
  };
}

export async function listDeliveryOwners(user: AuthenticatedUser, ticketId: string) {
  internal(user);
  return db.transaction(async (tx) => {
    await accessibleTicket(tx, user, ticketId);
    return tx
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(inArray(users.role, ['ADMIN', 'DEVELOPER']), eq(users.accountStatus, 'ACTIVE')))
      .orderBy(users.name, users.id)
      .limit(100);
  });
}
