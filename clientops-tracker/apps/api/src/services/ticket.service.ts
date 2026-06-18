import { and, desc, eq } from 'drizzle-orm';

import { db } from '../db/client';
import { projects, ticketComments, ticketEvents, tickets } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';
import { generateInitialTriageSuggestion } from './triage.service';
import { findDeveloperById } from './user.service';

type TicketRecord = typeof tickets.$inferSelect;
type ProjectRecord = typeof projects.$inferSelect;
type TicketWithProject = TicketRecord & {
  project: ProjectRecord;
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
      .select({ ticket: tickets, project: projects })
      .from(tickets)
      .innerJoin(projects, eq(tickets.projectId, projects.id))
      .where(eq(projects.clientId, user.clientId))
      .orderBy(desc(tickets.createdAt));

    return rows.map(toTicketWithProject);
  }

  const rows = await db
    .select({ ticket: tickets, project: projects })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .orderBy(desc(tickets.createdAt));

  return rows.map(toTicketWithProject);
}

export async function getTicketForUser(user: AuthenticatedUser, ticketId: string) {
  const row = await findTicketWithProject(ticketId);

  if (!row || !canAccessTicket(user, row)) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  }

  return row;
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

  const [ticket] = await db
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

  await db.insert(ticketEvents).values({
    ticketId: ticket.id,
    actorId: user.id,
    eventType: 'TICKET_CREATED',
    toValue: 'OPEN',
  });

  const triageSuggestion = await generateInitialTriageSuggestion(ticket);
  const createdTicket = await getTicketForUser(user, ticket.id);

  return {
    ...createdTicket,
    triageSuggestion,
  };
}

export async function updateTicketForUser(
  user: AuthenticatedUser,
  ticketId: string,
  data: UpdateTicketInput,
) {
  const existing = await getTicketForUser(user, ticketId);

  if (data.assignedToId) {
    await assertDeveloperExists(data.assignedToId);
  }

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

  const [updatedTicket] = await db
    .update(tickets)
    .set(updateData)
    .where(eq(tickets.id, ticketId))
    .returning();

  if (!updatedTicket) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  }

  await recordTicketUpdateEvents(user, existing, data);

  return getTicketForUser(user, updatedTicket.id);
}

export async function listTicketCommentsForUser(user: AuthenticatedUser, ticketId: string) {
  await getTicketForUser(user, ticketId);

  if (user.role === 'CLIENT') {
    return db
      .select()
      .from(ticketComments)
      .where(and(eq(ticketComments.ticketId, ticketId), eq(ticketComments.isInternal, false)))
      .orderBy(ticketComments.createdAt);
  }

  return db
    .select()
    .from(ticketComments)
    .where(eq(ticketComments.ticketId, ticketId))
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

  const [comment] = await db
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

  await db.insert(ticketEvents).values({
    ticketId,
    actorId: user.id,
    eventType: 'COMMENT_CREATED',
    toValue: comment.isInternal ? 'INTERNAL' : 'PUBLIC',
  });

  return comment;
}

async function findTicketWithProject(ticketId: string) {
  const [row] = await db
    .select({ ticket: tickets, project: projects })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
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
}): TicketWithProject {
  return {
    ...row.ticket,
    project: row.project,
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
  existing: TicketWithProject,
  data: UpdateTicketInput,
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
    await db.insert(ticketEvents).values(events);
  }
}
