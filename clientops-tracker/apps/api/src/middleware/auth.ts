import type { RequestHandler } from 'express';
import jwt, { type JwtPayload } from 'jsonwebtoken';

import { env } from '../config/env';
import { findUserById } from '../services/user.service';
import type { UserRole } from '../types/auth';
import { ApiError, asyncHandler, requireUser } from '../utils/http';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.header('authorization');
  const token = authorization?.startsWith('Bearer ') ? authorization.slice('Bearer '.length) : null;

  if (!token) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Bearer token is required.');
  }

  let payload: string | JwtPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid or expired token.');
  }

  if (typeof payload === 'string' || typeof payload.sub !== 'string') {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Invalid token payload.');
  }

  const user = await findUserById(payload.sub);

  if (!user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authenticated user no longer exists.');
  }

  req.user = user;
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
