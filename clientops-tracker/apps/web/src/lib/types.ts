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
