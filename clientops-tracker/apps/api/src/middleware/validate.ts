import type { Request, RequestHandler } from 'express';
import type { ZodType } from 'zod';

type RequestSchemas = {
  body?: ZodType;
  params?: ZodType<Request['params']>;
  query?: ZodType<Request['query']>;
};

export function validateRequest(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    if (schemas.params) {
      req.params = schemas.params.parse(req.params);
    }

    if (schemas.query) {
      req.query = schemas.query.parse(req.query);
    }

    if (schemas.body) {
      req.body = schemas.body.parse(req.body);
    }

    next();
  };
}
