import type { Request } from 'express';

import { ApiError } from './http';

export function getIdParam(req: Request) {
  const id = req.params.id;

  if (!id) {
    throw new ApiError(400, 'VALIDATION_ERROR', 'Route id parameter is required.');
  }

  return id;
}
