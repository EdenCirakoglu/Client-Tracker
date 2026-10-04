const uuid = { type: 'string', format: 'uuid' };
const note = {
  type: 'object',
  additionalProperties: false,
  required: ['ticketId', 'note'],
  properties: { ticketId: uuid, note: { type: 'string', minLength: 10, maxLength: 2000 } },
};
function operation(
  summary: string,
  parameters: string[],
  properties?: Record<string, unknown>,
  optional: string[] = [],
) {
  return {
    summary,
    tags: ['Product workflows'],
    security: [{ cookieAuth: [] }],
    description:
      'Cookie session required. Mutations require X-CSRF-Token. Client data is scoped by the server to the current organisation. No internal comments or triage are included. Summary publishing shares a reviewed snapshot in the portal, not by email.',
    parameters: parameters.map((name) => ({ name, in: 'path', required: true, schema: uuid })),
    ...(properties
      ? {
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  additionalProperties: false,
                  properties,
                  required: Object.keys(properties).filter((p) => !optional.includes(p)),
                },
              },
            },
          },
        }
      : {}),
    responses: {
      '200': {
        description:
          'Successful data envelope; scope routes return newest-first proposal arrays; summaries return snapshot or paginated list',
      },
      '201': { description: 'New proposal revision or private summary draft' },
      '400': { description: 'Invalid input or linked record' },
      '401': { description: 'Session required' },
      '403': { description: 'Forbidden role, non-designated approver or invalid CSRF' },
      '404': { description: 'Not found in permitted scope (including unpublished summaries)' },
      '409': { description: 'Stale revision or decision already recorded' },
    },
  };
}
export const productWorkflowPaths = {
  '/api/dashboard/delivery': {
    get: {
      ...operation('Permission-scoped delivery plan and full-scope counts', []),
      description:
        'Latest delivery revisions and latest pending scope proposals. Counts cover all authorised records, not just the page. Overdue means AGREED with a UTC target before today; delivered work awaiting acceptance is separate. Upcoming includes today and excludes today + 7 days. Clients see their designated decisions first. Stable order within that grouping: overdue, changes requested, acceptance, proposals, other; target date, creation, ID. No internal events or comments are returned.',
      parameters: [
        {
          in: 'query',
          name: 'view',
          schema: {
            type: 'string',
            enum: [
              'followup',
              'overdue',
              'upcoming',
              'agreement',
              'acceptance',
              'changes',
              'scope',
              'all',
            ],
            default: 'followup',
          },
        },
        { in: 'query', name: 'projectId', schema: uuid },
        {
          in: 'query',
          name: 'page',
          schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 },
        },
        {
          in: 'query',
          name: 'limit',
          schema: { type: 'integer', minimum: 1, maximum: 50, default: 20 },
        },
      ],
    },
  },
  '/api/tickets/{id}/scope': {
    get: operation('Read client-visible scope revisions', ['id']),
    post: operation(
      'Propose a new FEATURE_REQUEST scope revision (ADMIN/DEVELOPER)',
      ['id'],
      {
        expectedRevision: { type: 'integer', minimum: 0, maximum: 99 },
        approverId: uuid,
        scope: { type: 'string', minLength: 10, maxLength: 6000 },
        exclusions: { type: 'string', minLength: 1, maxLength: 4000 },
        estimate: {
          type: 'string',
          minLength: 1,
          maxLength: 500,
          description: 'Effort estimate, not logged time or an invoice amount.',
        },
        deliveryImplications: { type: 'string', minLength: 10, maxLength: 4000 },
        externalReference: { type: 'string', maxLength: 255 },
      },
      ['externalReference'],
    ),
  },
  '/api/tickets/{id}/scope/{revisionId}/decision': {
    post: operation(
      'Designated CLIENT approver decides on exactly this proposal revision',
      ['id', 'revisionId'],
      {
        decision: { type: 'string', enum: ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED'] },
        feedback: {
          type: 'string',
          maxLength: 4000,
          description: 'At least 10 characters unless approving.',
        },
      },
      ['feedback'],
    ),
  },
  '/api/summaries': {
    get: {
      ...operation('List summaries; CLIENT sees only published own-organisation snapshots', []),
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1, maximum: 10000, default: 1 },
        },
      ],
    },
    post: operation(
      'Prepare deterministic weekly summary draft (ADMIN/DEVELOPER)',
      [],
      {
        clientId: uuid,
        weekStart: {
          type: 'string',
          format: 'date',
          description: 'Seven days beginning at midnight UTC; must not start in the future.',
        },
        upcoming: { type: 'array', maxItems: 20, items: note },
        blocked: { type: 'array', maxItems: 20, items: note },
      },
      ['upcoming', 'blocked'],
    ),
  },
  '/api/summaries/{id}': { get: operation('Read a permitted summary snapshot', ['id']) },
  '/api/summaries/{id}/publish': {
    post: operation(
      'Publish reviewed draft to client portal (ADMIN/DEVELOPER); idempotent, no email',
      ['id'],
    ),
  },
};
