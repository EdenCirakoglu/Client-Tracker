import { sql } from 'drizzle-orm';
import { db } from '../db/client';
import { clients, deliveryRevisions, projects, tickets, users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';
import { requireCurrentWorkflowActor } from './workflow-access';

export async function onboardingForAdmin(user: AuthenticatedUser) {
  if (user.role !== 'ADMIN') throw new ApiError(403, 'FORBIDDEN', 'Administrator access required.');
  return db.transaction(async (tx) => {
    await requireCurrentWorkflowActor(tx, user);
    // One consistent snapshot, using EXISTS rather than counting unbounded business records.
    const [state] = await tx
      .select({
        organisation: sql<boolean>`exists(select 1 from ${clients} where length(trim(${clients.name})) > 0 and length(trim(${clients.contactEmail})) > 0)`,
        project: sql<boolean>`exists(select 1 from ${projects})`,
        contact: sql<boolean>`exists(select 1 from ${users} where ${users.role} = 'CLIENT' and ${users.clientId} is not null and ${users.accountStatus} in ('ACTIVE', 'INVITED'))`,
        request: sql<boolean>`exists(select 1 from ${tickets})`,
        acceptance: sql<boolean>`exists(select 1 from ${deliveryRevisions} where ${deliveryRevisions.state} = 'ACCEPTED')`,
      })
      .from(sql`(values (1)) as seed(n)`);
    const steps = [
      {
        key: 'organisation',
        title: 'Add client organisation details',
        href: '/clients',
        complete: state!.organisation,
      },
      {
        key: 'project',
        title: 'Create a client project',
        href: '/projects',
        complete: state!.project,
      },
      {
        key: 'contact',
        title: 'Invite a named client contact',
        href: '/users',
        complete: state!.contact,
      },
      {
        key: 'request',
        title: 'Record the first request',
        href: '/tickets/new',
        complete: state!.request,
      },
      {
        key: 'acceptance',
        title: 'Complete a client acceptance',
        href: '/delivery',
        complete: state!.acceptance,
      },
    ];
    return {
      scope: 'Across this installation',
      steps,
      completed: steps.filter((s) => s.complete).length,
    };
  });
}
