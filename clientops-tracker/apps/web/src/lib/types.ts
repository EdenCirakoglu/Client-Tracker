export type UserRole = 'ADMIN' | 'DEVELOPER' | 'CLIENT';

export type User = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clientId: string | null;
};

export type Client = {
  id: string;
  name: string;
  contactEmail: string;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProjectStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED';

export type Project = {
  id: string;
  clientId: string;
  name: string;
  description: string | null;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
};

export type TicketCategory = 'BUG' | 'FEATURE_REQUEST' | 'SUPPORT' | 'SECURITY' | 'PERFORMANCE';
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_FOR_CLIENT' | 'RESOLVED' | 'CLOSED';

export type Ticket = {
  id: string;
  projectId: string;
  createdById: string;
  assignedToId: string | null;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  project?: Project;
  assignee?: { id: string; name: string } | null;
  triageSuggestion?: TriageSuggestion | null;
  events?: {
    id: string;
    eventType: string;
    fromValue: string | null;
    toValue: string | null;
    createdAt: string;
  }[];
};

export type TicketComment = {
  id: string;
  ticketId: string;
  authorId: string;
  author?: { id: string; name: string };
  body: string;
  isInternal: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TriageSuggestion = {
  id: string;
  ticketId: string;
  suggestedCategory: TicketCategory;
  suggestedPriority: TicketPriority;
  summary: string;
  suggestedNextAction: string;
  confidenceScore: number;
  accepted: boolean;
  createdAt: string;
};

export type Release = {
  id: string;
  projectId: string;
  version: string;
  title: string;
  notes: string | null;
  releaseDate: string | null;
  createdAt: string;
  updatedAt: string;
  project?: Project;
};

export type DashboardMetrics = {
  unresolvedTickets: number;
  scope: string;
  generatedAt: string;
  resolvedMonth: string;
  totalOpenTickets: number;
  criticalTickets: number;
  ticketsWaitingForClient: number;
  resolvedTicketsThisMonth: number;
  averageResolutionTimeHours: number | null;
  ticketsByStatus: { status: TicketStatus; count: number }[];
  ticketsByPriority: { priority: TicketPriority; count: number }[];
  developerWorkload?: {
    developerId: string;
    name: string;
    email: string;
    openTickets: number;
  }[];
};

export interface TicketQueue {
  items: (Ticket & { client: { id: string; name: string } })[];
  total: number;
  page: number;
  limit: number;
}
export interface ActivityItem {
  id: string;
  recordId: string;
  title: string;
  project: string;
  actor: string | null;
  action: string;
  createdAt: string;
  kind: 'ticket' | 'release';
}
export interface ActivityPage {
  items: ActivityItem[];
  hasMore: boolean;
  page: number;
  limit: number;
  before: string;
}

export type LoginResponse = {
  csrfToken: string;
  user: User;
};

export interface DeliveryEvent {
  id: string;
  actorName: string;
  action: string;
  feedback: string | null;
  createdAt: string;
}
export interface DeliveryRevision {
  id: string;
  revision: number;
  outcome: string;
  targetDate: string | null;
  ownerId: string | null;
  ownerName: string | null;
  reviewerId: string;
  reviewerName: string;
  state: 'PROPOSED' | 'AGREED' | 'AWAITING_ACCEPTANCE' | 'ACCEPTED' | 'CHANGES_REQUESTED';
  releaseVersion: string | null;
  deliveryNotes: string | null;
  createdAt: string;
  events: DeliveryEvent[];
}
export interface DeliveryRecord {
  ticketId: string;
  project: string;
  title: string;
  originalRequest: string;
  originalCaptured: boolean;
  ticketStatus: TicketStatus;
  revisions: DeliveryRevision[];
}

export interface ScopeProposal {
  id: string;
  ticketId: string;
  revision: number;
  scope: string;
  exclusions: string;
  estimate: string;
  deliveryImplications: string;
  externalReference: string | null;
  approverId: string;
  approverName: string;
  proposedBy: string;
  state: 'PROPOSED' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
  feedback: string | null;
  decidedBy: string | null;
  decidedAt: string | null;
  createdAt: string;
}
export interface ScopeProposalInput {
  expectedRevision: number;
  approverId: string;
  scope: string;
  exclusions: string;
  estimate: string;
  deliveryImplications: string;
  externalReference: string;
}

export interface SummarySection {
  key: string;
  label: string;
  items: { title: string; href: string; detail: string; recordedAt: string | null }[];
  truncated: boolean;
}
export interface ProgressSummary {
  id: string;
  clientId: string;
  clientName: string;
  periodStart: string;
  periodEnd: string;
  createdBy: string;
  createdAt: string;
  publishedBy: string | null;
  publishedAt: string | null;
  sections: SummarySection[];
}
export interface SummaryInput {
  clientId: string;
  weekStart: string;
  upcoming: { ticketId: string; note: string }[];
  blocked: { ticketId: string; note: string }[];
}

export type DeliveryView =
  | 'followup'
  | 'overdue'
  | 'upcoming'
  | 'agreement'
  | 'acceptance'
  | 'changes'
  | 'scope'
  | 'all';
export interface DeliveryPlanItem {
  id: string;
  source: 'delivery' | 'scope';
  ticketId: string;
  title: string;
  projectId: string;
  projectName: string;
  clientName: string;
  revision: number;
  state: string;
  targetDate: string | null;
  ownerName: string | null;
  reviewerId: string;
  reviewerName: string;
  releaseVersion: string | null;
  createdAt: string;
  reason: string;
  yourDecision: boolean;
  href: string;
}
export interface DeliveryPlan {
  items: DeliveryPlanItem[];
  counts: Record<DeliveryView, number>;
  total: number;
  page: number;
  limit: number;
  asOf: string;
  today: string;
  through: string;
}
