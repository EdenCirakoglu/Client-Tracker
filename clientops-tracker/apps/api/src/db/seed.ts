import bcrypt from 'bcryptjs';
import { pathToFileURL } from 'node:url';

import { db, pool } from './client';
import {
  clients,
  projects,
  releases,
  ticketComments,
  ticketEvents,
  tickets,
  triageSuggestions,
  users,
} from './schema';

export async function seedDatabase() {
  const passwordHash = await bcrypt.hash('password123', 12);

  await db.transaction(async (tx) => {
    await tx.delete(triageSuggestions);
    await tx.delete(ticketEvents);
    await tx.delete(ticketComments);
    await tx.delete(releases);
    await tx.delete(tickets);
    await tx.delete(projects);
    await tx.delete(users);
    await tx.delete(clients);

    const [northstar, bluewave] = await tx
      .insert(clients)
      .values([
        {
          name: 'Northstar Logistics',
          contactEmail: 'ops@northstar.example',
          phone: '+1-555-0142',
        },
        {
          name: 'Bluewave Health',
          contactEmail: 'support@bluewave.example',
        },
      ])
      .returning();

    if (!northstar || !bluewave) {
      throw new Error('Failed to seed clients.');
    }

    const [admin, developer, clientUser] = await tx
      .insert(users)
      .values([
        {
          name: 'Admin User',
          email: 'admin@example.com',
          passwordHash,
          role: 'ADMIN',
        },
        {
          name: 'Developer User',
          email: 'developer@example.com',
          passwordHash,
          role: 'DEVELOPER',
        },
        {
          name: 'Client User',
          email: 'client@example.com',
          passwordHash,
          role: 'CLIENT',
          clientId: northstar.id,
        },
      ])
      .returning();

    if (!admin || !developer || !clientUser) {
      throw new Error('Failed to seed users.');
    }

    const [portal, mobile, reporting] = await tx
      .insert(projects)
      .values([
        {
          clientId: northstar.id,
          name: 'Operations Portal',
          description: 'Internal dashboard for shipment support and escalation workflows.',
          status: 'ACTIVE',
        },
        {
          clientId: northstar.id,
          name: 'Driver Mobile App',
          description: 'Mobile issue reporting and delivery confirmation app.',
          status: 'PAUSED',
        },
        {
          clientId: bluewave.id,
          name: 'Patient Reporting Suite',
          description: 'Client-facing reporting platform for support and analytics teams.',
          status: 'ACTIVE',
        },
      ])
      .returning();

    if (!portal || !mobile || !reporting) {
      throw new Error('Failed to seed projects.');
    }

    const seededTickets = await tx
      .insert(tickets)
      .values([
        {
          projectId: portal.id,
          createdById: clientUser.id,
          assignedToId: developer.id,
          title: 'Shipment detail page fails to load for archived orders',
          description:
            'Archived shipment records return a blank panel when opened from global search.',
          category: 'BUG',
          priority: 'HIGH',
          status: 'IN_PROGRESS',
        },
        {
          projectId: portal.id,
          createdById: admin.id,
          assignedToId: developer.id,
          title: 'Add client-specific SLA indicators',
          description:
            'Support managers need SLA badges on tickets so priority queues are easier to scan.',
          category: 'FEATURE_REQUEST',
          priority: 'MEDIUM',
          status: 'OPEN',
        },
        {
          projectId: portal.id,
          createdById: clientUser.id,
          title: 'Cannot export weekly operations report',
          description: 'CSV export times out for weekly reports with more than 5,000 rows.',
          category: 'PERFORMANCE',
          priority: 'CRITICAL',
          status: 'WAITING_FOR_CLIENT',
        },
        {
          projectId: mobile.id,
          createdById: clientUser.id,
          assignedToId: developer.id,
          title: 'Push notifications arrive twice',
          description: 'Drivers receive duplicate push notifications for the same dispatch update.',
          category: 'BUG',
          priority: 'MEDIUM',
          status: 'RESOLVED',
          resolvedAt: new Date('2026-06-03T14:00:00.000Z'),
        },
        {
          projectId: mobile.id,
          createdById: admin.id,
          title: 'Review password reset copy',
          description:
            'Client success requested clearer instructions on the password reset screen.',
          category: 'SUPPORT',
          priority: 'LOW',
          status: 'CLOSED',
          resolvedAt: new Date('2026-05-28T11:30:00.000Z'),
        },
        {
          projectId: reporting.id,
          createdById: admin.id,
          assignedToId: developer.id,
          title: 'Investigate unusual failed login spike',
          description:
            'Monitoring detected repeated failed logins against two client administrator accounts.',
          category: 'SECURITY',
          priority: 'CRITICAL',
          status: 'IN_PROGRESS',
        },
        {
          projectId: reporting.id,
          createdById: clientUser.id,
          title: 'Add PDF download for monthly report',
          description: 'Account managers need a printable version of monthly analytics reports.',
          category: 'FEATURE_REQUEST',
          priority: 'HIGH',
          status: 'OPEN',
        },
        {
          projectId: reporting.id,
          createdById: admin.id,
          assignedToId: developer.id,
          title: 'Dashboard filters reset after refresh',
          description:
            'Saved report filters are not restored when users refresh the dashboard page.',
          category: 'SUPPORT',
          priority: 'MEDIUM',
          status: 'OPEN',
        },
      ])
      .returning();

    const [
      archivedOrdersTicket,
      slaTicket,
      exportTicket,
      duplicatePushTicket,
      resetCopyTicket,
      loginSpikeTicket,
    ] = seededTickets;

    if (
      !archivedOrdersTicket ||
      !slaTicket ||
      !exportTicket ||
      !duplicatePushTicket ||
      !resetCopyTicket ||
      !loginSpikeTicket
    ) {
      throw new Error('Failed to seed tickets.');
    }

    await tx.insert(ticketComments).values([
      {
        ticketId: archivedOrdersTicket.id,
        authorId: clientUser.id,
        body: 'This is affecting the operations team during end-of-day reconciliation.',
        isInternal: false,
      },
      {
        ticketId: archivedOrdersTicket.id,
        authorId: developer.id,
        body: 'Reproduced locally. The archive query is missing a project scope filter.',
        isInternal: true,
      },
      {
        ticketId: exportTicket.id,
        authorId: admin.id,
        body: 'Waiting for a sample report date range from the client.',
        isInternal: true,
      },
      {
        ticketId: duplicatePushTicket.id,
        authorId: developer.id,
        body: 'Fixed by deduplicating dispatch event subscriptions.',
        isInternal: false,
      },
      {
        ticketId: loginSpikeTicket.id,
        authorId: admin.id,
        body: 'Security review started. Temporary rate limits have been increased.',
        isInternal: true,
      },
    ]);

    await tx.insert(ticketEvents).values([
      {
        ticketId: archivedOrdersTicket.id,
        actorId: clientUser.id,
        eventType: 'TICKET_CREATED',
        toValue: 'OPEN',
      },
      {
        ticketId: archivedOrdersTicket.id,
        actorId: developer.id,
        eventType: 'STATUS_CHANGED',
        fromValue: 'OPEN',
        toValue: 'IN_PROGRESS',
      },
      {
        ticketId: exportTicket.id,
        actorId: admin.id,
        eventType: 'STATUS_CHANGED',
        fromValue: 'OPEN',
        toValue: 'WAITING_FOR_CLIENT',
      },
      {
        ticketId: duplicatePushTicket.id,
        actorId: developer.id,
        eventType: 'STATUS_CHANGED',
        fromValue: 'IN_PROGRESS',
        toValue: 'RESOLVED',
      },
      {
        ticketId: resetCopyTicket.id,
        actorId: admin.id,
        eventType: 'STATUS_CHANGED',
        fromValue: 'RESOLVED',
        toValue: 'CLOSED',
      },
      {
        ticketId: loginSpikeTicket.id,
        actorId: admin.id,
        eventType: 'PRIORITY_CHANGED',
        fromValue: 'HIGH',
        toValue: 'CRITICAL',
      },
    ]);

    await tx.insert(releases).values([
      {
        projectId: portal.id,
        version: '1.4.0',
        title: 'Operations Queue Improvements',
        notes: 'Improved queue filtering and added internal escalation indicators.',
        releaseDate: new Date('2026-05-30T10:00:00.000Z'),
      },
      {
        projectId: reporting.id,
        version: '2.1.0',
        title: 'Reporting Performance Update',
        notes: 'Optimized report generation and added export progress states.',
        releaseDate: new Date('2026-06-06T10:00:00.000Z'),
      },
    ]);

    await tx.insert(triageSuggestions).values([
      {
        ticketId: archivedOrdersTicket.id,
        suggestedCategory: 'BUG',
        suggestedPriority: 'HIGH',
        summary: 'Archived shipment records fail during lookup from global search.',
        suggestedNextAction: 'Inspect archive query filters and reproduce against seeded data.',
        confidenceScore: 91,
        accepted: true,
      },
      {
        ticketId: exportTicket.id,
        suggestedCategory: 'PERFORMANCE',
        suggestedPriority: 'CRITICAL',
        summary: 'Large CSV exports are timing out for operational reports.',
        suggestedNextAction: 'Profile export query and move generation into a background job.',
        confidenceScore: 86,
      },
      {
        ticketId: loginSpikeTicket.id,
        suggestedCategory: 'SECURITY',
        suggestedPriority: 'CRITICAL',
        summary: 'Failed login spike may indicate credential stuffing or misconfigured clients.',
        suggestedNextAction: 'Review IP distribution, user agents, and recent authentication logs.',
        confidenceScore: 94,
        accepted: true,
      },
    ]);
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  seedDatabase()
    .then(() => {
      console.log('Database seeded successfully.');
    })
    .catch((error) => {
      console.error('Database seed failed.');
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await pool.end();
    });
}
