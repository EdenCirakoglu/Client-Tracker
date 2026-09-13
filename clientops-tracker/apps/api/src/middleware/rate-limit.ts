import { RateLimiterPostgres, RateLimiterRes } from 'rate-limiter-flexible';
import { pool } from '../db/client';
import { env } from '../config/env';
import { hashToken } from './session';
import { ApiError, asyncHandler } from '../utils/http';

export function rateLimit(keyPrefix: string, points: number, duration: number, email = false) {
  const limiter = new RateLimiterPostgres({
    storeClient: pool,
    storeType: 'pool',
    tableName: 'auth_rate_limits',
    tableCreated: true,
    clearExpiredByTimeout: env.NODE_ENV !== 'test',
    keyPrefix,
    points,
    duration,
  });
  return asyncHandler(async (req, res, next) => {
    const key = email
      ? hashToken(
          `${req.ip}:${String(req.body?.email ?? '')
            .trim()
            .toLowerCase()}`,
        )
      : hashToken(req.ip ?? 'unknown');
    try {
      await limiter.consume(key);
    } catch (error) {
      if (!(error instanceof RateLimiterRes))
        throw new ApiError(503, 'AUTH_UNAVAILABLE', 'Authentication is temporarily unavailable.');
      res.set('Retry-After', String(Math.max(1, Math.ceil(error.msBeforeNext / 1000))));
      throw new ApiError(
        429,
        'RATE_LIMITED',
        'Too many attempts. Please wait before trying again.',
      );
    }
    next();
  });
}
