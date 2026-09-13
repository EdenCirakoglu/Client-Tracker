import type { RequestHandler } from 'express';
import { and, eq, isNull, sql } from 'drizzle-orm';

import { env } from '../config/env';
import { db } from '../db/client';
import { authSessions, users } from '../db/schema';
import { hashToken, revokeSession } from './session';
import type { UserRole } from '../types/auth';
import { ApiError, asyncHandler, requireUser } from '../utils/http';

export const authenticate = asyncHandler(async (req, res, next) => {
  if (req.get('authorization') || !req.session.userId)
    throw new ApiError(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  const [user] = await db.select().from(users).where(eq(users.id, req.session.userId));
  const [grant] =
    user && user.accountStatus === 'ACTIVE' && (!user.isDemo || env.DEMO_MODE)
      ? await db
          .update(authSessions)
          .set({
            lastSeenAt: sql`clock_timestamp()`,
            idleExpiresAt: sql`LEAST(${authSessions.absoluteExpiresAt}, clock_timestamp() + ${env.SESSION_IDLE_SECONDS} * interval '1 second')`,
          })
          .where(
            and(
              eq(authSessions.sidHash, hashToken(req.sessionID)),
              eq(authSessions.userId, user.id),
              eq(authSessions.authVersion, user.authVersion),
              isNull(authSessions.revokedAt),
              sql`${authSessions.idleExpiresAt} > clock_timestamp()`,
              sql`${authSessions.absoluteExpiresAt} > clock_timestamp()`,
            ),
          )
          .returning()
      : [];
  if (!grant || !user) {
    await revokeSession(req, res);
    throw new ApiError(401, 'SESSION_EXPIRED', 'Your session has ended. Please sign in again.');
  }
  req.session.cookie.maxAge = Math.max(
    0,
    Math.min(env.SESSION_IDLE_SECONDS * 1000, grant.absoluteExpiresAt.getTime() - Date.now()),
  );
  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    clientId: user.clientId,
  };
  next();
});

export function authorizeRoles(...roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    const user = requireUser(req);

    if (!roles.includes(user.role)) {
      throw new ApiError(403, 'FORBIDDEN', 'You do not have permission to perform this action.');
    }

    next();
  };
}
