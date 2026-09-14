import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';

import { env } from '../config/env';
import { ApiError } from '../utils/http';
import { invalidCsrfTokenError } from './session';
import { databaseUnavailable } from '../db/readiness';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} was not found.`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (databaseUnavailable(error)) {
    res
      .set('Retry-After', '5')
      .status(503)
      .json({
        error: {
          code: 'SERVICE_UNAVAILABLE',
          message: 'Service temporarily unavailable. Please retry.',
        },
      });
    return;
  }
  if (error === invalidCsrfTokenError) {
    res.status(403).json({
      error: {
        code: 'CSRF_INVALID',
        message: 'Your form has expired. Refresh the page and try again.',
      },
    });
    return;
  }
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed.',
        details: error.flatten(),
      },
    });
    return;
  }

  if (isDatabaseUniqueViolation(error)) {
    res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: 'A record with the same unique value already exists.',
      },
    });
    return;
  }

  if (env.NODE_ENV !== 'test') {
    console.error('Unexpected API request failure.');
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error.',
    },
  });
};

function isDatabaseUniqueViolation(error: unknown) {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}
