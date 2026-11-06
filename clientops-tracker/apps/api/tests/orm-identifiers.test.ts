import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { errorHandler } from '../src/middleware/error';
import { authHeader, loginSession } from './helpers/auth';

describe('PostgreSQL identifier escaping', () => {
  it('quotes embedded delimiters as identifier data while keeping values parameterized', () => {
    const identifier = 'record"; SELECT 1; --';
    const query = new PgDialect().sqlToQuery(sql`select ${sql.identifier(identifier)}, ${'value'}`);
    expect(query.sql).toBe('select "record""; SELECT 1; --", $1');
    expect(query.params).toEqual(['value']);
  });
});

describe('PostgreSQL error compatibility', () => {
  beforeAll(() => seedDatabase());
  afterAll(() => pool.end());

  it('bounds cyclic error causes and retains the generic error response', async () => {
    const error = new Error('Private database details');
    error.cause = error;
    const app = express();
    app.get('/', (_req, _res, next) => next(error));
    app.use(errorHandler);
    const response = await request(app).get('/').expect(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error.' },
    });
  });

  it('retains a sanitized conflict response for a duplicate project release version', async () => {
    const app = createApp();
    const admin = await loginSession(app, 'admin@example.com');
    const existing = (await request(app).get('/api/releases').set(authHeader(admin)).expect(200))
      .body.data[0];
    const response = await request(app)
      .post('/api/releases')
      .set(authHeader(admin))
      .send({
        projectId: existing.projectId,
        version: existing.version,
        title: 'Duplicate version',
      })
      .expect(409);
    expect(response.body).toEqual({
      error: { code: 'CONFLICT', message: 'A record with the same unique value already exists.' },
    });
  });
});
