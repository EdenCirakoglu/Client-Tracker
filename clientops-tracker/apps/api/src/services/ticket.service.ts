import { and, desc, eq, getTableColumns } from 'drizzle-orm';

import { db } from '../db/client';
import { projects, ticketComments, ticketEvents, tickets, users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';
import { generateInitialTriageSuggestion, getLatestTriageSuggestion } from './triage.service';
import { findDeveloperById } from './user.service';

type TicketRecord = typeof tickets.$inferSelect;
type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type ProjectRecord = typeof projects.$inferSelect;
type TicketWithProject = TicketRecord & {
  project: ProjectRecord;
  assignee: { id: string; name: string } | null;
};

const ticketSelection = {
  ticket: tickets,
  project: projects,
  assignee: { id: users.id, name: users.name },
};

type CreateTicketInput = {
  projectId: string;
  assignedToId?: string | null;
  title: string;
  description: string;
  category: 'BUG' | 'FEATURE_REQUEST' | 'SUPPORT' | 'SECURITY' | 'PERFORMANCE';
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
};

type UpdateTicketInput = Partial<
  Pick<
    TicketRecord,
    'assignedToId' | 'title' | 'description' | 'category' | 'priority' | 'status' | 'resolvedAt'
  >
>;

type CreateCommentInput = {
  body: string;
  isInternal?: boolean;
};

export async function listTicketsForUser(user: AuthenticatedUser) {
  if (user.role === 'CLIENT') {
    if (!user.clientId) {
      return [];
    }

    const rows = await db
      .select(ticketSelection)
      .from(tickets)
      .innerJoin(projects, eq(tickets.projectId, projects.id))
      .leftJoin(users, eq(tickets.assignedToId, users.id))
      .where(eq(projects.clientId, user.clientId))
      .orderBy(desc(tickets.createdAt));

    return rows.map(toTicketWithProject);
  }

  const rows = await db
    .select(ticketSelection)
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .leftJoin(users, eq(tickets.assignedToId, users.id))
    .orderBy(desc(tickets.createdAt));

  return rows.map(toTicketWithProject);
}

export async function getTicketForUser(user: AuthenticatedUser, ticketId: string) {
  const row = await findTicketWithProject(ticketId);

  if (!row || !canAccessTicket(user, row)) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  }

  if (user.role === 'CLIENT') return row;
  const [triageSuggestion, events] = await Promise.all([
    getLatestTriageSuggestion(ticketId),
    db
      .select()
      .from(ticketEvents)
      .where(eq(ticketEvents.ticketId, ticketId))
      .orderBy(ticketEvents.createdAt, ticketEvents.id),
  ]);
  return { ...row, triageSuggestion, events };
}

export async function createTicketForUser(user: AuthenticatedUser, data: CreateTicketInput) {
  const project = await findProject(data.projectId);

  if (!project || (user.role === 'CLIENT' && project.clientId !== user.clientId)) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
  }

  if (user.role === 'CLIENT' && data.assignedToId) {
    throw new ApiError(403, 'FORBIDDEN', 'Clients cannot assign tickets.');
  }

  if (data.assignedToId) {
    await assertDeveloperExists(data.assignedToId);
  }

  const createdId = await db.transaction(async (tx) => {
    const [ticket] = await tx
      .insert(tickets)
      .values({
        projectId: data.projectId,
        createdById: user.id,
        assignedToId: data.assignedToId ?? null,
        title: data.title,
        description: data.description,
        category: data.category,
        priority: data.priority ?? 'MEDIUM',
        status: 'OPEN',
      })
      .returning();

    if (!ticket) {
      throw new ApiError(500, 'TICKET_CREATE_FAILED', 'Ticket could not be created.');
    }

    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      actorId: user.id,
      eventType: 'TICKET_CREATED',
      toValue: 'OPEN',
    });

    await generateInitialTriageSuggestion(ticket, tx);
    return ticket.id;
  });
  return getTicketForUser(user, createdId);
}

export async function updateTicketForUser(
  user: AuthenticatedUser,
  ticketId: string,
  data: UpdateTicketInput,
) {
  await getTicketForUser(user, ticketId);

  if (data.assignedToId) {
    await assertDeveloperExists(data.assignedToId);
  }

  await db.transaction(async (tx) => {
    // Read the current state under the same lock used by triage application.
    const [existing] = await tx
      .select()
      .from(tickets)
      .where(eq(tickets.id, ticketId))
      .for('update');
    if (!existing) throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
    const updateData: Partial<typeof tickets.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (data.assignedToId !== undefined) {
      updateData.assignedToId = data.assignedToId;
    }

    if (data.title !== undefined) {
      updateData.title = data.title;
    }

    if (data.description !== undefined) {
      updateData.description = data.description;
    }

    if (data.category !== undefined) {
      updateData.category = data.category;
    }

    if (data.priority !== undefined) {
      updateData.priority = data.priority;
    }

    if (data.status !== undefined) {
      updateData.status = data.status;

      if (
        ['RESOLVED', 'CLOSED'].includes(data.status) &&
        !existing.resolvedAt &&
        data.resolvedAt === undefined
      ) {
        updateData.resolvedAt = new Date();
      }
    }

    if (data.resolvedAt !== undefined) {
      updateData.resolvedAt = data.resolvedAt;
    }

    const [updatedTicket] = await tx
      .update(tickets)
      .set(updateData)
      .where(eq(tickets.id, ticketId))
      .returning();

    if (!updatedTicket) {
      throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
    }

    await recordTicketUpdateEvents(user, existing, data, tx);
  });

  return getTicketForUser(user, ticketId);
}

export async function listTicketCommentsForUser(user: AuthenticatedUser, ticketId: string) {
  await getTicketForUser(user, ticketId);
  return db
    .select({ ...getTableColumns(ticketComments), author: { id: users.id, name: users.name } })
    .from(ticketComments)
    .innerJoin(users, eq(ticketComments.authorId, users.id))
    .where(
      and(
        eq(ticketComments.ticketId, ticketId),
        user.role === 'CLIENT' ? eq(ticketComments.isInternal, false) : undefined,
      ),
    )
    .orderBy(ticketComments.createdAt);
}

export async function createTicketCommentForUser(
  user: AuthenticatedUser,
  ticketId: string,
  data: CreateCommentInput,
) {
  await getTicketForUser(user, ticketId);

  if (user.role === 'CLIENT' && data.isInternal) {
    throw new ApiError(403, 'FORBIDDEN', 'Clients cannot create internal comments.');
  }

  return db.transaction(async (tx) => {
    const [comment] = await tx
      .insert(ticketComments)
      .values({
        ticketId,
        authorId: user.id,
        body: data.body,
        isInternal: user.role === 'CLIENT' ? false : Boolean(data.isInternal),
      })
      .returning();

    if (!comment) {
      throw new ApiError(500, 'COMMENT_CREATE_FAILED', 'Comment could not be created.');
    }

    await tx.insert(ticketEvents).values({
      ticketId,
      actorId: user.id,
      eventType: 'COMMENT_CREATED',
      toValue: comment.isInternal ? 'INTERNAL' : 'PUBLIC',
    });

    return { ...comment, author: { id: user.id, name: user.name } };
  });
}

async function findTicketWithProject(ticketId: string) {
  const [row] = await db
    .select(ticketSelection)
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .leftJoin(users, eq(tickets.assignedToId, users.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  return row ? toTicketWithProject(row) : null;
}

async function findProject(projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);
  return project ?? null;
}

function toTicketWithProject(row: {
  ticket: TicketRecord;
  project: ProjectRecord;
  assignee: { id: string; name: string } | null;
}): TicketWithProject {
  return {
    ...row.ticket,
    project: row.project,
    assignee: row.assignee,
  };
}

function canAccessTicket(user: AuthenticatedUser, ticket: TicketWithProject) {
  return user.role !== 'CLIENT' || ticket.project.clientId === user.clientId;
}

async function assertDeveloperExists(userId: string) {
  const developer = await findDeveloperById(userId);

  if (!developer) {
    throw new ApiError(400, 'INVALID_ASSIGNEE', 'Assigned user must be a developer.');
  }
}

async function recordTicketUpdateEvents(
  user: AuthenticatedUser,
  existing: TicketRecord,
  data: UpdateTicketInput,
  tx: Transaction,
) {
  const events: (typeof ticketEvents.$inferInsert)[] = [];

  if (data.status && data.status !== existing.status) {
    events.push({
      ticketId: existing.id,
      actorId: user.id,
      eventType: 'STATUS_CHANGED',
      fromValue: existing.status,
      toValue: data.status,
    });
  }

  if (data.priority && data.priority !== existing.priority) {
    events.push({
      ticketId: existing.id,
      actorId: user.id,
      eventType: 'PRIORITY_CHANGED',
      fromValue: existing.priority,
      toValue: data.priority,
    });
  }

  if (data.category && data.category !== existing.category) {
    events.push({
      ticketId: existing.id,
      actorId: user.id,
      eventType: 'CATEGORY_CHANGED',
      fromValue: existing.category,
      toValue: data.category,
    });
  }

  if (data.assignedToId !== undefined && data.assignedToId !== existing.assignedToId) {
    events.push({
      ticketId: existing.id,
      actorId: user.id,
      eventType: 'ASSIGNEE_CHANGED',
      fromValue: existing.assignedToId,
      toValue: data.assignedToId,
    });
  }

  if (events.length > 0) {
    await tx.insert(ticketEvents).values(events);
  }
}
