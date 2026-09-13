import { and, eq } from 'drizzle-orm';

import { db } from '../db/client';
import { users } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';

export const publicUserColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  clientId: users.clientId,
};

export async function findUserById(id: string): Promise<AuthenticatedUser | null> {
  const [user] = await db.select(publicUserColumns).from(users).where(eq(users.id, id)).limit(1);
  return user ?? null;
}

export async function findUserWithPasswordByEmail(email: string) {
  const [user] = await db
    .select({
      ...publicUserColumns,
      passwordHash: users.passwordHash,
      accountStatus: users.accountStatus,
      authVersion: users.authVersion,
      isDemo: users.isDemo,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return user ?? null;
}

export async function findDeveloperById(id: string) {
  const [developer] = await db
    .select(publicUserColumns)
    .from(users)
    .where(and(eq(users.id, id), eq(users.role, 'DEVELOPER'), eq(users.accountStatus, 'ACTIVE')))
    .limit(1);

  return developer ?? null;
}
