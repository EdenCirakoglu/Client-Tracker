import { createHash } from 'node:crypto';
import type { Request, Response } from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { csrfSync } from 'csrf-sync';
import { eq } from 'drizzle-orm';
import { env } from '../config/env';
import { db, pool } from '../db/client';
import { authSessions } from '../db/schema';
import { ApiError, asyncHandler } from '../utils/http';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
  }
}

export const hashToken = (value: string) => createHash('sha256').update(value).digest('hex');
export const cookieName = env.NODE_ENV === 'production' ? '__Host-clientops.sid' : 'clientops.sid';
const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};
const PgStore = connectPgSimple(session);
export const sessionStore = new PgStore({
  pool,
  tableName: 'web_sessions',
  createTableIfMissing: false,
  pruneSessionInterval: env.NODE_ENV === 'test' ? false : 900,
});
export const sessionMiddleware = session({
  name: cookieName,
  secret: env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: { ...cookieOptions, maxAge: env.SESSION_IDLE_SECONDS * 1000 },
});
export const {
  generateToken: csrfToken,
  csrfSynchronisedProtection,
  invalidCsrfTokenError,
} = csrfSync();
export const csrfProtection = asyncHandler((req, res, next) => {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.get('origin');
    if (origin && ![env.APP_ORIGIN, env.API_ORIGIN].includes(origin))
      throw new ApiError(403, 'CSRF_INVALID', 'Request origin is not permitted.');
  }
  csrfSynchronisedProtection(req, res, next);
});
export const saveSession = (req: Request) =>
  new Promise<void>((resolve, reject) =>
    req.session.save((error) => (error ? reject(error) : resolve())),
  );
export const regenerateSession = (req: Request) =>
  new Promise<void>((resolve, reject) =>
    req.session.regenerate((error) => (error ? reject(error) : resolve())),
  );
export async function revokeGrant(req: Request) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(eq(authSessions.sidHash, hashToken(req.sessionID)));
}
export async function revokeSession(req: Request, res: Response) {
  await revokeGrant(req);
  await new Promise<void>((resolve, reject) =>
    req.session.destroy((error) => (error ? reject(error) : resolve())),
  );
  res.clearCookie(cookieName, cookieOptions);
}
