import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import type { Request } from 'express';
import { eq } from 'drizzle-orm';

import { env } from '../config/env';
import { findUserWithPasswordByEmail } from './user.service';
import { ApiError } from '../utils/http';
import { db } from '../db/client';
import { authSessions, users } from '../db/schema';
import {
  csrfToken,
  hashToken,
  regenerateSession,
  revokeGrant,
  saveSession,
} from '../middleware/session';

const dummyHash = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);

export async function loginWithPassword(req: Request, email: string, password: string) {
  const user = await findUserWithPasswordByEmail(email);

  const passwordMatches = await bcrypt.compare(password, user?.passwordHash ?? dummyHash);

  if (
    !passwordMatches ||
    !user ||
    user.accountStatus !== 'ACTIVE' ||
    (user.isDemo && !env.DEMO_MODE)
  ) {
    throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  await revokeGrant(req);
  await regenerateSession(req);
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(users).where(eq(users.id, user.id)).for('update');
    if (
      !current ||
      current.accountStatus !== 'ACTIVE' ||
      current.authVersion !== user.authVersion ||
      current.passwordHash !== user.passwordHash
    )
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
    await tx.insert(authSessions).values({
      sidHash: hashToken(req.sessionID),
      userId: user.id,
      authVersion: current.authVersion,
      idleExpiresAt: new Date(Date.now() + env.SESSION_IDLE_SECONDS * 1000),
      absoluteExpiresAt: new Date(Date.now() + env.SESSION_ABSOLUTE_SECONDS * 1000),
    });
  });
  req.session.userId = user.id;
  const token = csrfToken(req, true);
  await saveSession(req);
  return {
    csrfToken: token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      clientId: user.clientId,
    },
  };
}
