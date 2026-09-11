import type {
  TicketQueue,
  ActivityPage,
  Client,
  DashboardMetrics,
  LoginResponse,
  Project,
  ProjectStatus,
  Release,
  Ticket,
  TicketCategory,
  TicketComment,
  TicketPriority,
  TicketStatus,
  TriageSuggestion,
  User,
} from './types';

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');
let csrf: string | null = null;
let csrfRequest: Promise<string> | null = null;

type ApiResponse<T> = {
  data: T;
};

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PATCH';
  body?: unknown;
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function clearCsrf() {
  csrf = null;
  csrfRequest = null;
}
async function getCsrf() {
  if (csrf) return csrf;
  csrfRequest ??= apiRequest<{ csrfToken: string }>('/api/auth/csrf')
    .then((data) => {
      csrf = data.csrfToken;
      return csrf;
    })
    .finally(() => {
      csrfRequest = null;
    });
  return csrfRequest;
}

async function apiRequest<T>(path: string, options: RequestOptions = {}) {
  const token = options.method && options.method !== 'GET' ? await getCsrf() : null;
  const response = await fetch(`${API_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'X-CSRF-Token': token } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | { error?: { code?: string; message?: string } }
    | null;

  if (!response.ok) {
    if (response.status === 401 && path !== '/api/auth/login') {
      clearCsrf();
      window.dispatchEvent(new Event('clientops:session-expired'));
    }

    const error = payload && 'error' in payload ? payload.error : undefined;
    throw new ApiError(
      response.status,
      error?.code ?? 'REQUEST_FAILED',
      error?.message ?? 'Request failed.',
    );
  }

  if (!payload || !('data' in payload)) {
    throw new ApiError(500, 'INVALID_RESPONSE', 'API returned an invalid response.');
  }

  return payload.data;
}

export const api = {
  login: async (email: string, password: string) => {
    const result = await apiRequest<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    csrf = result.csrfToken;
    return result;
  },
  config: () => apiRequest<{ demoEnabled: boolean }>('/api/auth/config'),
  logout: async () => {
    await apiRequest('/api/auth/logout', { method: 'POST' });
    clearCsrf();
  },
  forgotPassword: (email: string) =>
    apiRequest<{ message: string }>('/api/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),
  setPassword: (token: string, password: string, invitation: boolean) =>
    apiRequest<{ message: string }>(
      `/api/auth/${invitation ? 'accept-invitation' : 'reset-password'}`,
      { method: 'POST', body: { token, password } },
    ),
  changePassword: (currentPassword: string, password: string) =>
    apiRequest<{ message: string }>('/api/auth/change-password', {
      method: 'POST',
      body: { currentPassword, password },
    }),
  users: () => apiRequest<Account[]>('/api/users'),
  invite: (body: { name: string; email: string; role: User['role']; clientId: string | null }) =>
    apiRequest<User>('/api/users/invitations', { method: 'POST', body }),
  updateAccount: (
    id: string,
    body: { role: User['role']; clientId: string | null; disabled: boolean },
  ) => apiRequest<Account>(`/api/users/${id}`, { method: 'PATCH', body }),
  me: () => apiRequest<User>('/api/auth/me'),
  clients: () => apiRequest<Client[]>('/api/clients'),
  createClient: (body: { name: string; contactEmail: string; phone?: string | null }) =>
    apiRequest<Client>('/api/clients', { method: 'POST', body }),
  updateClient: (
    id: string,
    body: Partial<{ name: string; contactEmail: string; phone: string | null }>,
  ) => apiRequest<Client>(`/api/clients/${id}`, { method: 'PATCH', body }),
  projects: () => apiRequest<Project[]>('/api/projects'),
  createProject: (body: {
    clientId: string;
    name: string;
    description?: string | null;
    status?: ProjectStatus;
  }) => apiRequest<Project>('/api/projects', { method: 'POST', body }),
  updateProject: (
    id: string,
    body: Partial<{ name: string; description: string | null; status: ProjectStatus }>,
  ) => apiRequest<Project>(`/api/projects/${id}`, { method: 'PATCH', body }),
  tickets: () => apiRequest<Ticket[]>('/api/tickets'),
  ticketQueue: (query: string = '') => apiRequest<TicketQueue>(`/api/tickets/queue?${query}`),
  activity: (query: string = '') => apiRequest<ActivityPage>(`/api/dashboard/activity?${query}`),
  ticket: (id: string) => apiRequest<Ticket>(`/api/tickets/${id}`),
  createTicket: (body: {
    projectId: string;
    title: string;
    description: string;
    category: TicketCategory;
    priority?: TicketPriority;
  }) => apiRequest<Ticket>('/api/tickets', { method: 'POST', body }),
  updateTicket: (
    id: string,
    body: Partial<{
      status: TicketStatus;
      priority: TicketPriority;
      category: TicketCategory;
      title: string;
      description: string;
    }>,
  ) => apiRequest<Ticket>(`/api/tickets/${id}`, { method: 'PATCH', body }),
  comments: (ticketId: string) => apiRequest<TicketComment[]>(`/api/tickets/${ticketId}/comments`),
  createComment: (ticketId: string, body: { body: string; isInternal?: boolean }) =>
    apiRequest<TicketComment>(`/api/tickets/${ticketId}/comments`, {
      method: 'POST',
      body,
    }),
  dashboardMetrics: () => apiRequest<DashboardMetrics>('/api/dashboard/metrics'),
  releases: () => apiRequest<Release[]>('/api/releases'),
  createRelease: (body: {
    projectId: string;
    version: string;
    title: string;
    notes?: string | null;
    releaseDate?: string | null;
  }) => apiRequest<Release>('/api/releases', { method: 'POST', body }),
  generateTriageSuggestion: (ticketId: string) =>
    apiRequest<TriageSuggestion>(`/api/tickets/${ticketId}/triage-suggestion`, {
      method: 'POST',
    }),
  applyTriageSuggestion: (ticketId: string) =>
    apiRequest<{ ticket: Ticket; triageSuggestion: TriageSuggestion }>(
      `/api/tickets/${ticketId}/apply-triage-suggestion`,
      { method: 'PATCH' },
    ),
};
export type Account = User & { accountStatus: 'ACTIVE' | 'INVITED' | 'DISABLED' };
