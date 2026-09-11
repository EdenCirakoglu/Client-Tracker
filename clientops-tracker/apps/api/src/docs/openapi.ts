import { env } from '../config/env';
export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'ClientOps Tracker API',
    version: '0.5.0',
    description:
      'Cookie-session REST API. First GET /api/auth/csrf, retain cookies, then send X-CSRF-Token on every POST/PATCH including login. Login rotates the session and returns a fresh CSRF token. Swagger obtains this token automatically. Bearer JWTs are no longer accepted. Recovery links arrive by email; no public registration. ADMIN controls invitations and account membership.',
  },
  servers: [
    {
      url: '/',
      description: 'Current origin, direct API or Nginx proxy',
    },
  ],
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: env.NODE_ENV === 'production' ? '__Host-clientops.sid' : 'clientops.sid',
      },
    },
    schemas: {
      ErrorResponse: {
        type: 'object',
        properties: {
          error: {
            type: 'object',
            properties: {
              code: { type: 'string' },
              message: { type: 'string' },
              details: {},
            },
          },
        },
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@example.com' },
          password: { type: 'string', example: 'password123' },
        },
      },
      ClientInput: {
        type: 'object',
        required: ['name', 'contactEmail'],
        properties: {
          name: { type: 'string' },
          contactEmail: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
        },
      },
      ProjectInput: {
        type: 'object',
        required: ['clientId', 'name'],
        properties: {
          clientId: { type: 'string', format: 'uuid' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
        },
      },
      TicketInput: {
        type: 'object',
        required: ['projectId', 'title', 'description', 'category'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          assignedToId: { type: 'string', format: 'uuid', nullable: true },
          title: { type: 'string' },
          description: { type: 'string' },
          category: {
            type: 'string',
            enum: ['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'SECURITY', 'PERFORMANCE'],
          },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
        },
      },
      ClientUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 160 },
          contactEmail: { type: 'string', format: 'email' },
          phone: { type: 'string', nullable: true },
        },
      },
      ProjectUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 160 },
          description: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'PAUSED', 'COMPLETED'] },
        },
      },
      TicketUpdate: {
        type: 'object',
        minProperties: 1,
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 220 },
          description: { type: 'string', minLength: 1 },
          assignedToId: { type: 'string', format: 'uuid', nullable: true },
          category: {
            type: 'string',
            enum: ['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'SECURITY', 'PERFORMANCE'],
          },
          priority: { type: 'string', enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
          status: {
            type: 'string',
            enum: ['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED'],
          },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
        },
        example: { status: 'IN_PROGRESS' },
      },
      CommentInput: {
        type: 'object',
        required: ['body'],
        properties: {
          body: { type: 'string' },
          isInternal: { type: 'boolean' },
        },
      },
      ReleaseInput: {
        type: 'object',
        required: ['projectId', 'version', 'title'],
        properties: {
          projectId: { type: 'string', format: 'uuid' },
          version: { type: 'string' },
          title: { type: 'string' },
          notes: { type: 'string', nullable: true },
          releaseDate: { type: 'string', format: 'date-time', nullable: true },
        },
      },
      TriageSuggestion: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          ticketId: { type: 'string', format: 'uuid' },
          suggestedCategory: {
            type: 'string',
            enum: ['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'SECURITY', 'PERFORMANCE'],
            example: 'SECURITY',
          },
          suggestedPriority: {
            type: 'string',
            enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
            example: 'CRITICAL',
          },
          summary: {
            type: 'string',
            example: 'Potential data leak in a client-facing report export.',
          },
          suggestedNextAction: {
            type: 'string',
            example:
              'Escalate to internal technical team, review logs, and assess potential data exposure.',
          },
          confidenceScore: {
            type: 'integer',
            minimum: 0,
            maximum: 100,
            example: 95,
            description:
              'Fixed heuristic rule-match score, not a calibrated probability. No live LLM is used.',
          },
          accepted: { type: 'boolean', example: false },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      ApplyTriageSuggestionResponse: {
        type: 'object',
        properties: {
          ticket: { type: 'object' },
          triageSuggestion: { $ref: '#/components/schemas/TriageSuggestion' },
        },
      },
    },
  },
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        responses: {
          '200': { description: 'API is healthy' },
        },
      },
    },
    '/api/health': {
      get: {
        summary: 'API liveness through the Nginx origin',
        responses: {
          '200': {
            description: 'API process is responding; this is not a database readiness probe.',
          },
        },
      },
    },
    '/api/auth/login': {
      post: {
        summary: 'Log in with portal credentials (examples are local demo only)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
            },
          },
        },
        responses: {
          '200': { description: 'Set-Cookie (HttpOnly SID) and data: {user, csrfToken}; no JWT.' },
          '401': { description: 'Invalid credentials' },
          '403': { description: 'Missing or invalid CSRF token/origin' },
          '429': { description: 'Rate limited; Retry-After header in seconds' },
        },
      },
    },
    '/api/auth/me': authPath('Get current authenticated user'),
    '/api/auth/config': {
      get: {
        summary: 'Whether local disposable demo shortcuts are enabled',
        responses: { '200': { description: 'data: {demoEnabled: boolean}' } },
      },
    },
    '/api/auth/csrf': {
      get: {
        summary: 'Establish anonymous session and get CSRF token',
        responses: {
          '200': { description: 'data: {csrfToken: string}; retain the cookie' },
          '429': { description: 'Rate limited' },
        },
      },
    },
    '/api/auth/logout': { post: accountOperation('Revoke this session', {}) },
    '/api/auth/forgot-password': {
      post: accountOperation('Request recovery; identical 202 whether account exists or not', {
        email: { type: 'string', format: 'email' },
      }),
    },
    '/api/auth/accept-invitation': {
      post: accountOperation(
        'Consume a single-use invitation (role and organisation are server assigned)',
        {
          token: { type: 'string', pattern: '^[a-f0-9]{64}$' },
          password: { type: 'string', minLength: 12, description: 'Maximum 72 UTF-8 bytes' },
        },
      ),
    },
    '/api/auth/reset-password': {
      post: accountOperation('Consume reset link and revoke all account sessions', {
        token: { type: 'string', pattern: '^[a-f0-9]{64}$' },
        password: { type: 'string', minLength: 12 },
      }),
    },
    '/api/auth/change-password': {
      post: accountOperation('Change current password and revoke all account sessions', {
        currentPassword: { type: 'string' },
        password: { type: 'string', minLength: 12 },
      }),
    },
    '/api/users': authPath('ADMIN only: list accounts without credentials'),
    '/api/users/invitations': {
      post: accountOperation('ADMIN only: create or resend a pending invitation', {
        name: { type: 'string' },
        email: { type: 'string', format: 'email' },
        role: { type: 'string', enum: ['ADMIN', 'DEVELOPER', 'CLIENT'] },
        clientId: {
          type: 'string',
          format: 'uuid',
          nullable: true,
          description: 'Required for CLIENT; null for staff',
        },
      }),
    },
    '/api/users/{id}': {
      patch: {
        ...accountOperation('ADMIN only: change role/organisation or disable; revoke sessions', {
          role: { type: 'string', enum: ['ADMIN', 'DEVELOPER', 'CLIENT'] },
          clientId: { type: 'string', format: 'uuid', nullable: true },
          disabled: { type: 'boolean' },
        }),
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } },
        ],
      },
    },
    '/api/clients': collectionPath('Clients', '#/components/schemas/ClientInput', true),
    '/api/clients/{id}': itemPath('Client'),
    '/api/projects': collectionPath('Projects', '#/components/schemas/ProjectInput', true),
    '/api/projects/{id}': itemPath('Project'),
    '/api/tickets': collectionPath('Tickets', '#/components/schemas/TicketInput', true),
    '/api/tickets/{id}': itemPath('Ticket', true),
    '/api/tickets/{id}/triage-suggestion': {
      post: triageOperation(
        'Generate or refresh a rule-based triage suggestion',
        '#/components/schemas/TriageSuggestion',
      ),
    },
    '/api/tickets/{id}/apply-triage-suggestion': {
      patch: triageOperation(
        'Apply the latest triage suggestion to the ticket',
        '#/components/schemas/ApplyTriageSuggestionResponse',
      ),
    },
    '/api/tickets/{id}/comments': {
      get: securedOperation('List ticket comments', undefined, true),
      post: securedOperation('Create ticket comment', '#/components/schemas/CommentInput', true),
    },
    '/api/releases': collectionPath('Releases', '#/components/schemas/ReleaseInput', true),
    '/api/dashboard/metrics': authPath(
      'Get scoped dashboard metrics; developerWorkload is omitted entirely for CLIENT users',
    ),
  },
};

function collectionPath(label: string, requestSchema: string, canPost = false) {
  return {
    get: securedOperation(`List ${label.toLowerCase()}`),
    ...(canPost
      ? { post: securedOperation(`Create ${label.slice(0, -1).toLowerCase()}`, requestSchema) }
      : {}),
  };
}

function itemPath(label: string, canPatch = true) {
  return {
    get: securedOperation(`Get ${label.toLowerCase()} by id`, undefined, true),
    ...(canPatch
      ? {
          patch: securedOperation(
            `Update ${label.toLowerCase()}`,
            `#/components/schemas/${label}Update`,
            true,
          ),
        }
      : {}),
  };
}

function authPath(summary: string) {
  return {
    get: securedOperation(summary),
  };
}

function securedOperation(summary: string, requestSchema?: string, hasIdParam = false) {
  return {
    summary,
    security: [{ cookieAuth: [] }],
    ...(hasIdParam
      ? {
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
        }
      : {}),
    ...(requestSchema
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: requestSchema },
              },
            },
          },
        }
      : {}),
    responses: {
      '200': { description: 'Successful response' },
      '201': { description: 'Created' },
      '400': { description: 'Invalid reference', content: jsonErrorContent() },
      '422': { description: 'Validation error', content: jsonErrorContent() },
      '401': { description: 'Authentication required', content: jsonErrorContent() },
      '403': { description: 'Forbidden', content: jsonErrorContent() },
      '404': { description: 'Not found', content: jsonErrorContent() },
    },
  };
}

function triageOperation(summary: string, responseSchema: string) {
  return {
    summary,
    description:
      'ADMIN and DEVELOPER only. Deterministic rules, not a live LLM. Ticket detail loads the saved suggestion for internal users only. Application is transactional and idempotent: repeating an accepted suggestion does not change the ticket or create another event.',
    security: [{ cookieAuth: [] }],
    parameters: [
      {
        name: 'id',
        in: 'path',
        required: true,
        schema: { type: 'string', format: 'uuid' },
      },
    ],
    responses: {
      '200': {
        description: 'Successful response',
        content: successContent(responseSchema),
      },
      '201': {
        description: 'Triage suggestion created',
        content: successContent(responseSchema),
      },
      '401': { description: 'Authentication required', content: jsonErrorContent() },
      '403': { description: 'Forbidden', content: jsonErrorContent() },
      '404': { description: 'Ticket or suggestion not found', content: jsonErrorContent() },
    },
  };
}

function successContent(responseSchema: string) {
  const suggestion = {
    id: '0e1fbc32-3267-4e59-ae61-ea3cf6d16325',
    ticketId: '7f814be7-bd6e-4393-9990-f9e572dbfd53',
    suggestedCategory: 'SECURITY',
    suggestedPriority: 'CRITICAL',
    summary: 'Security keywords matched. Potential incident requiring internal review.',
    suggestedNextAction:
      'Escalate to internal technical team, review logs, and assess potential data exposure.',
    confidenceScore: 95,
    accepted: false,
    createdAt: '2026-06-12T12:00:00.000Z',
  };
  return {
    'application/json': {
      schema: {
        type: 'object',
        properties: {
          data: { $ref: responseSchema },
        },
      },
      examples: {
        securitySuggestion: {
          value: {
            data: responseSchema.endsWith('/ApplyTriageSuggestionResponse')
              ? {
                  ticket: { id: suggestion.ticketId, category: 'SECURITY', priority: 'CRITICAL' },
                  triageSuggestion: { ...suggestion, accepted: true },
                }
              : suggestion,
          },
        },
      },
    },
  };
}

function jsonErrorContent() {
  return {
    'application/json': {
      schema: { $ref: '#/components/schemas/ErrorResponse' },
    },
  };
}

function accountOperation(summary: string, properties: Record<string, unknown>) {
  return {
    summary,
    description:
      'Requires the synchronizer X-CSRF-Token header and its session cookie. Invalid/expired/used tokens return LINK_INVALID. Authentication and recovery are rate limited.',
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            additionalProperties: false,
            required: Object.keys(properties),
            properties,
          },
        },
      },
    },
    responses: {
      '200': { description: 'Successful operation, data envelope' },
      '201': { description: 'Invitation delivered' },
      '202': { description: 'Generic recovery acknowledgement' },
      '400': { description: 'Invalid input or expired/used link' },
      '401': { description: 'Session ended' },
      '403': { description: 'Forbidden or CSRF invalid' },
      '409': { description: 'Account conflict' },
      '429': { description: 'Rate limited' },
      '503': { description: 'Mail or authentication service unavailable' },
    },
  };
}
