import { and, asc, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '../db/client';
import {
  accountTokens,
  clients,
  deliveryEvents,
  deliveryRevisions,
  mailOutbox,
  projects,
  scopeProposals,
  tickets,
  users,
} from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';
import { requireCurrentWorkflowActor } from './workflow-access';

export async function onboardingForClient(user: AuthenticatedUser, clientId: string) {
  if (user.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Administrator access required.');
  return db.transaction(
    async (tx) => {
      await requireCurrentWorkflowActor(tx, user);
      const [client] = await tx
        .select({ id: clients.id, name: clients.name })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);
      if (!client) throw new ApiError(404, 'NOT_FOUND', 'Client not found.');
      const [project] = await tx
        .select({ id: projects.id, name: projects.name })
        .from(projects)
        .where(eq(projects.clientId, clientId))
        .orderBy(asc(projects.createdAt), asc(projects.id))
        .limit(1);
      const [reviewer] = await tx
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(
          and(
            eq(users.clientId, clientId),
            eq(users.role, 'CLIENT'),
            eq(users.accountStatus, 'ACTIVE'),
          ),
        )
        .orderBy(asc(users.createdAt), asc(users.id))
        .limit(1);
      // Account mail is linked through its token, not workflow-mail recipient_id. Never return payloads.
      const [invitation] = await tx
        .select({ status: mailOutbox.status, name: users.name })
        .from(mailOutbox)
        .innerJoin(accountTokens, eq(mailOutbox.tokenId, accountTokens.id))
        .innerJoin(users, eq(accountTokens.userId, users.id))
        .where(
          and(
            eq(users.clientId, clientId),
            eq(users.role, 'CLIENT'),
            eq(mailOutbox.kind, 'INVITATION'),
          ),
        )
        .orderBy(desc(mailOutbox.createdAt), desc(mailOutbox.id))
        .limit(1);
      const [request] = await tx
        .select({ id: tickets.id, title: tickets.title })
        .from(tickets)
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(eq(projects.clientId, clientId))
        .orderBy(asc(tickets.createdAt), asc(tickets.id))
        .limit(1);
      const [deliveryDecision] = await tx
        .select({
          ticketId: tickets.id,
          title: tickets.title,
          actor: deliveryEvents.actorName,
          action: deliveryEvents.action,
          at: deliveryEvents.createdAt,
        })
        .from(deliveryEvents)
        .innerJoin(deliveryRevisions, eq(deliveryEvents.revisionId, deliveryRevisions.id))
        .innerJoin(tickets, eq(deliveryRevisions.ticketId, tickets.id))
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(
          and(
            eq(projects.clientId, clientId),
            inArray(deliveryEvents.action, ['AGREED', 'ACCEPTED', 'CHANGES_REQUESTED']),
          ),
        )
        .orderBy(asc(deliveryEvents.createdAt), asc(deliveryEvents.id))
        .limit(1);
      const [scopeDecision] = await tx
        .select({
          ticketId: tickets.id,
          title: tickets.title,
          actor: scopeProposals.decidedBy,
          action: scopeProposals.state,
          at: scopeProposals.decidedAt,
        })
        .from(scopeProposals)
        .innerJoin(tickets, eq(scopeProposals.ticketId, tickets.id))
        .innerJoin(projects, eq(tickets.projectId, projects.id))
        .where(and(eq(projects.clientId, clientId), isNotNull(scopeProposals.decidedAt)))
        .orderBy(asc(scopeProposals.decidedAt), asc(scopeProposals.id))
        .limit(1);
      const decisions = [
        ...(deliveryDecision ? [{ ...deliveryDecision, section: 'delivery' }] : []),
        ...(scopeDecision ? [{ ...scopeDecision, section: 'scope' }] : []),
      ].sort((a, b) => a.at!.getTime() - b.at!.getTime());
      return {
        client,
        project: project ?? null,
        reviewer: reviewer ?? null,
        invitation: invitation ?? null,
        request: request ?? null,
        decision: decisions[0] ?? null,
      };
    },
    { isolationLevel: 'repeatable read' },
  );
}

export async function onboardingForAdmin(user: AuthenticatedUser) {
  if (user.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Administrator access required.');
  return db.transaction(async (tx) => {
    await requireCurrentWorkflowActor(tx, user);
    // One consistent snapshot, using EXISTS rather than counting unbounded business records.
    const [state] = await tx
      .select({
        organisation: sql<boolean>`exists(select 1 from ${clients} where length(trim(${clients.name})) > 0 and length(trim(${clients.contactEmail})) > 0)`,
        project: sql<boolean>`exists(select 1 from ${projects})`,
        contact: sql<boolean>`exists(select 1 from ${users} where ${users.role} = 'CLIENT' and ${users.clientId} is not null and ${users.accountStatus} in ('ACTIVE', 'INVITED'))`,
        request: sql<boolean>`exists(select 1 from ${tickets})`,
        acceptance: sql<boolean>`exists(select 1 from ${deliveryRevisions} where ${deliveryRevisions.state} = 'ACCEPTED')`,
      })
      .from(sql`(values (1)) as seed(n)`);
    const steps = [
      {
        key: 'organisation',
        title: 'Add client organisation details',
        href: '/clients',
        complete: state!.organisation,
      },
      {
        key: 'project',
        title: 'Create a client project',
        href: '/projects',
        complete: state!.project,
      },
      {
        key: 'contact',
        title: 'Invite a named client contact',
        href: '/users',
        complete: state!.contact,
      },
      {
        key: 'request',
        title: 'Record the first request',
        href: '/tickets/new',
        complete: state!.request,
      },
      {
        key: 'acceptance',
        title: 'Complete a client acceptance',
        href: '/delivery',
        complete: state!.acceptance,
      },
    ];
    return {
      scope: 'Across this installation',
      steps,
      completed: steps.filter((s) => s.complete).length,
    };
  });
}
