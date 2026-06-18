import { desc, eq } from 'drizzle-orm';

import { db } from '../db/client';
import { projects, ticketEvents, tickets, triageSuggestions } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';

type TicketRecord = typeof tickets.$inferSelect;
type ProjectRecord = typeof projects.$inferSelect;
type TicketCategory = TicketRecord['category'];
type TicketPriority = TicketRecord['priority'];

type TriageDraft = {
  suggestedCategory: TicketCategory;
  suggestedPriority: TicketPriority;
  summary: string;
  suggestedNextAction: string;
  confidenceScore: number;
};

type TicketWithProject = TicketRecord & {
  project: ProjectRecord;
};

const securityTerms = [
  'security',
  'breach',
  'hacked',
  'unauthorised',
  'unauthorized',
  'data leak',
  'exposed',
  'compromised',
];

const criticalAvailabilityTerms = [
  'production down',
  'site down',
  'system down',
  'cannot access',
  'cannot login',
  'payment failed',
  'outage',
];

const performanceTerms = ['slow', 'latency', 'timeout', 'performance', 'loading', 'lag'];

const featureTerms = [
  'new feature',
  'could you add',
  'enhancement',
  'request',
  'improve',
  'would like',
];

const bugTerms = ['bug', 'error', 'broken', 'crash', 'not working', 'issue'];

export function evaluateTicketTriage(
  ticket: Pick<TicketRecord, 'title' | 'description'>,
): TriageDraft {
  const text = normalizeTicketText(ticket);

  if (matchesAny(text, securityTerms)) {
    const criticalTerms = ['breach', 'hacked', 'data leak', 'exposed', 'compromised'];

    return {
      suggestedCategory: 'SECURITY',
      suggestedPriority: matchesAny(text, criticalTerms) ? 'CRITICAL' : 'HIGH',
      summary: summarizeTicket(ticket, 'Potential security incident requiring internal review.'),
      suggestedNextAction:
        'Escalate to internal technical team, review logs, and assess potential data exposure.',
      confidenceScore: matchesAny(text, criticalTerms) ? 95 : 88,
    };
  }

  if (matchesAny(text, criticalAvailabilityTerms)) {
    const bugLike = matchesAny(text, ['error', 'bug', 'broken', 'failed', 'cannot login']);

    return {
      suggestedCategory: bugLike ? 'BUG' : 'SUPPORT',
      suggestedPriority: matchesAny(text, ['production down', 'site down', 'system down', 'outage'])
        ? 'CRITICAL'
        : 'HIGH',
      summary: summarizeTicket(ticket, 'Availability issue that may affect client operations.'),
      suggestedNextAction:
        'Investigate service availability, reproduce the issue, and update the client with progress.',
      confidenceScore: 90,
    };
  }

  if (matchesAny(text, performanceTerms)) {
    return {
      suggestedCategory: 'PERFORMANCE',
      suggestedPriority: matchesAny(text, ['timeout', 'performance', 'latency'])
        ? 'HIGH'
        : 'MEDIUM',
      summary: summarizeTicket(ticket, 'Performance degradation reported by the user.'),
      suggestedNextAction:
        'Check application logs, database queries, and recent deployments for performance regressions.',
      confidenceScore: 86,
    };
  }

  if (matchesAny(text, featureTerms)) {
    return {
      suggestedCategory: 'FEATURE_REQUEST',
      suggestedPriority: matchesAny(text, ['request', 'would like', 'new feature'])
        ? 'MEDIUM'
        : 'LOW',
      summary: summarizeTicket(ticket, 'Product enhancement or workflow improvement request.'),
      suggestedNextAction:
        'Clarify business requirement, estimate effort, and add to product backlog.',
      confidenceScore: 82,
    };
  }

  if (matchesAny(text, bugTerms)) {
    return {
      suggestedCategory: 'BUG',
      suggestedPriority: matchesAny(text, ['crash', 'broken', 'error']) ? 'HIGH' : 'MEDIUM',
      summary: summarizeTicket(
        ticket,
        'Likely product defect requiring reproduction and diagnosis.',
      ),
      suggestedNextAction:
        'Reproduce the issue, identify affected users, and assign to a developer.',
      confidenceScore: 84,
    };
  }

  return {
    suggestedCategory: 'SUPPORT',
    suggestedPriority: text.length > 180 ? 'MEDIUM' : 'LOW',
    summary: summarizeTicket(ticket, 'General support request needing clarification.'),
    suggestedNextAction: 'Request further details from the client and confirm expected behaviour.',
    confidenceScore: 68,
  };
}

export async function generateTriageSuggestionForTicket(user: AuthenticatedUser, ticketId: string) {
  const ticket = await getTicketForTriage(user, ticketId);
  return saveTriageSuggestion(ticket.id, evaluateTicketTriage(ticket));
}

export async function generateInitialTriageSuggestion(
  ticket: Pick<TicketRecord, 'id' | 'title' | 'description'>,
) {
  return saveTriageSuggestion(ticket.id, evaluateTicketTriage(ticket));
}

export async function applyLatestTriageSuggestion(user: AuthenticatedUser, ticketId: string) {
  const ticket = await getTicketForTriage(user, ticketId);
  const [latestSuggestion] = await db
    .select()
    .from(triageSuggestions)
    .where(eq(triageSuggestions.ticketId, ticket.id))
    .orderBy(desc(triageSuggestions.createdAt))
    .limit(1);

  if (!latestSuggestion) {
    throw new ApiError(
      404,
      'TRIAGE_SUGGESTION_NOT_FOUND',
      'No triage suggestion exists for this ticket.',
    );
  }

  return db.transaction(async (tx) => {
    const [updatedTicket] = await tx
      .update(tickets)
      .set({
        category: latestSuggestion.suggestedCategory,
        priority: latestSuggestion.suggestedPriority,
        updatedAt: new Date(),
      })
      .where(eq(tickets.id, ticket.id))
      .returning();

    if (!updatedTicket) {
      throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
    }

    const [acceptedSuggestion] = await tx
      .update(triageSuggestions)
      .set({
        accepted: true,
      })
      .where(eq(triageSuggestions.id, latestSuggestion.id))
      .returning();

    await tx.insert(ticketEvents).values({
      ticketId: ticket.id,
      actorId: user.id,
      eventType: 'TRIAGE_SUGGESTION_APPLIED',
      fromValue: `${ticket.category}/${ticket.priority}`,
      toValue: `${latestSuggestion.suggestedCategory}/${latestSuggestion.suggestedPriority}`,
    });

    return {
      ticket: updatedTicket,
      triageSuggestion: acceptedSuggestion ?? latestSuggestion,
    };
  });
}

async function saveTriageSuggestion(ticketId: string, suggestion: TriageDraft) {
  const [savedSuggestion] = await db
    .insert(triageSuggestions)
    .values({
      ticketId,
      ...suggestion,
    })
    .returning();

  if (!savedSuggestion) {
    throw new ApiError(
      500,
      'TRIAGE_SUGGESTION_CREATE_FAILED',
      'Triage suggestion could not be created.',
    );
  }

  return savedSuggestion;
}

async function getTicketForTriage(user: AuthenticatedUser, ticketId: string) {
  const [row] = await db
    .select({ ticket: tickets, project: projects })
    .from(tickets)
    .innerJoin(projects, eq(tickets.projectId, projects.id))
    .where(eq(tickets.id, ticketId))
    .limit(1);

  if (!row || !canAccessTicket(user, { ...row.ticket, project: row.project })) {
    throw new ApiError(404, 'TICKET_NOT_FOUND', 'Ticket was not found.');
  }

  return row.ticket;
}

function canAccessTicket(user: AuthenticatedUser, ticket: TicketWithProject) {
  return user.role !== 'CLIENT' || ticket.project.clientId === user.clientId;
}

function normalizeTicketText(ticket: Pick<TicketRecord, 'title' | 'description'>) {
  return `${ticket.title} ${ticket.description}`.toLowerCase();
}

function matchesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function summarizeTicket(ticket: Pick<TicketRecord, 'title' | 'description'>, fallback: string) {
  const source = ticket.description.trim() || ticket.title.trim() || fallback;
  const compact = source.replace(/\s+/g, ' ');

  if (compact.length <= 140) {
    return compact;
  }

  return `${compact.slice(0, 137).trimEnd()}...`;
}
