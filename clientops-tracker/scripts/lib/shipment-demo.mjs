import assert from 'node:assert/strict';
import { request } from '@playwright/test';

// API-only fixture: no direct database writes, reset, bypass or recipient creation.
export async function prepareShipmentDemo(origin) {
  const url = new URL(origin);
  assert.ok(['localhost', '127.0.0.1'].includes(url.hostname));
  assert.equal(process.env.E2E_ALLOW_DISPOSABLE_DEMO, 'true');
  const contexts = [];
  async function data(response) {
    assert.ok(response.ok(), `Demo API returned HTTP ${response.status()}`);
    return (await response.json()).data;
  }
  async function mutate(api, path, body, method = 'post') {
    const { csrfToken } = await data(await api.get('/api/auth/csrf'));
    return data(await api[method](path, { data: body, headers: { 'X-CSRF-Token': csrfToken } }));
  }
  async function login(email) {
    const api = await request.newContext({ baseURL: origin, ignoreHTTPSErrors: true });
    contexts.push(api);
    assert.equal((await data(await api.get('/api/auth/config'))).demoEnabled, true);
    await mutate(api, '/api/auth/login', { email, password: 'password123' });
    return api;
  }
  try {
    const admin = await login('admin@example.com');
    const staff = await login('developer@example.com');
    const client = await login('client@example.com');
    const person = await data(await client.get('/api/auth/me'));
    const owner = await data(await staff.get('/api/auth/me'));
    const projects = await data(await client.get('/api/projects'));
    const project = projects.find((item) => item.name === 'Operations Portal');
    assert.ok(project, 'Fictional Operations Portal project is required.');
    const ticket = await mutate(client, '/api/tickets', {
      projectId: project.id,
      title: 'Shipment search: active and archived references',
      description:
        'Our dispatch team needs to find shipments by the original customer reference. Both active and archived shipments must be searchable.',
      category: 'FEATURE_REQUEST',
    });
    const path = `/api/tickets/${ticket.id}`;
    const proposal = {
      approverId: person.id,
      scope: 'Find active shipments by customer reference.',
      exclusions: 'Archived shipments are excluded from this first proposal.',
      estimate: 'One engineering day, estimate only.',
      deliveryImplications: 'Client verification follows the next Operations Portal release.',
      externalReference: 'DEMO-Q-104',
    };
    const first = await mutate(staff, `${path}/scope`, { ...proposal, expectedRevision: 0 });
    await mutate(client, `${path}/scope/${first[0].id}/decision`, {
      decision: 'CHANGES_REQUESTED',
      feedback: 'Include archived shipments as well as active shipments.',
    });
    const second = await mutate(staff, `${path}/scope`, {
      ...proposal,
      expectedRevision: 1,
      scope: 'Find active and archived shipments by customer reference.',
      exclusions: 'Bulk exports and historical imports are excluded.',
      estimate: 'Two engineering days, estimate only.',
    });
    await mutate(client, `${path}/scope/${second[0].id}/decision`, {
      decision: 'APPROVED',
      feedback: 'Revision 2 covers the active and archived search we requested.',
    });
    const outcome = { reviewerId: person.id, ownerId: owner.id, targetDate: null };
    const firstOutcome = await mutate(staff, `${path}/delivery`, {
      ...outcome,
      expectedRevision: 0,
      outcome: 'An active shipment can be found by its customer reference.',
    });
    await mutate(client, `${path}/delivery/${firstOutcome.revisions[0].id}/decision`, {
      decision: 'CHANGES_REQUESTED',
      feedback: 'The outcome must also cover archived shipments.',
    });
    const secondOutcome = await mutate(staff, `${path}/delivery`, {
      ...outcome,
      expectedRevision: 1,
      outcome:
        'Active shipment NS-1042 and archived shipment NS-0921 can both be found by customer reference and show their correct status.',
    });
    const revisionId = secondOutcome.revisions[0].id;
    await mutate(client, `${path}/delivery/${revisionId}/decision`, {
      decision: 'AGREED',
      feedback: 'These two reference checks define our agreed outcome.',
    });
    const releases = await data(await admin.get('/api/releases'));
    let release = releases.find(
      (item) => item.projectId === project.id && item.version === '1.5.0-demo',
    );
    if (!release)
      release = await mutate(admin, '/api/releases', {
        projectId: project.id,
        version: '1.5.0-demo',
        title: 'Shipment Reference Search',
        releaseDate: new Date().toISOString().slice(0, 10),
        notes:
          'Active and archived shipment lookup delivered for client verification. Publishing does not record acceptance.',
      });
    await mutate(staff, `${path}/delivery/${revisionId}/request-acceptance`, {
      releaseId: release.id,
      deliveryNotes:
        'Search shipped in 1.5.0-demo. Please verify active NS-1042 and archived NS-0921 before accepting. The demonstration includes a reported active-reference failure.',
    });
    await mutate(staff, path, { status: 'RESOLVED' }, 'patch');
    await mutate(client, `${path}/comments`, {
      body: 'Archived NS-0921 is found, but active NS-1042 still returns no result. I will record this against the agreed outcome.',
      isInternal: false,
    });
    return { ticketId: ticket.id, revisionId, projectId: project.id, title: ticket.title };
  } finally {
    for (const api of contexts) await api.dispose();
  }
}
