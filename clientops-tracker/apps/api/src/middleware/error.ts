import type { ErrorRequestHandler, RequestHandler } from 'express';

import { env } from '../config/env';

export const notFoundHandler: RequestHandler = (req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} was not found.`,
    },
  });
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (env.NODE_ENV !== 'test') {
    console.error(error);
  }

  res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: env.NODE_ENV === 'production' ? 'Unexpected server error.' : error.message,
    },
  });
};

