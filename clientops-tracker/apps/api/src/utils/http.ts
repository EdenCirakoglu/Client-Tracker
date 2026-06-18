import type { NextFunction, Request, RequestHandler, Response } from 'express';

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<void> | void,
): RequestHandler {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function sendSuccess<T>(res: Response, data: T, statusCode = 200, meta?: unknown) {
  res.status(statusCode).json({
    data,
    ...(meta ? { meta } : {}),
  });
}

export function requireUser(req: Request) {
  if (!req.user) {
    throw new ApiError(401, 'UNAUTHENTICATED', 'Authentication is required.');
  }

  return req.user;
}
