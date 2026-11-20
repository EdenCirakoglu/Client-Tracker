import { eq } from 'drizzle-orm';
import { db } from '../db/client';
import { users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { requireCurrentWorkflowActor } from './workflow-access';

export async function notificationPreferences(user: AuthenticatedUser, enabled?: boolean) {
  return db.transaction(async (tx) => {
    await requireCurrentWorkflowActor(tx, user);
    if (enabled !== undefined)
      await tx.update(users).set({ workflowNotifications: enabled }).where(eq(users.id, user.id));
    const [record] = await tx
      .select({ workflowNotifications: users.workflowNotifications })
      .from(users)
      .where(eq(users.id, user.id));
    return record!;
  });
}
