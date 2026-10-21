import { createRequire } from 'node:module';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { authHeader, loginSession, type SessionAuth } from './helpers/auth';

// Exercise Express's resolved transitive parser, not an unrelated direct dependency.
const require = createRequire(import.meta.url);
const expressRequire = createRequire(require.resolve('express'));
const qs = expressRequire('qs') as {
  parse: (input: string, options?: Record<string, unknown>) => unknown;
  stringify: (input: unknown) => string;
};
const app = createApp();
let admin: SessionAuth;

describe('Request parsing dependency regressions', () => {
  beforeAll(async () => {
    await seedDatabase();
    admin = await loginSession(app, 'admin@example.com');
  });
  afterAll(() => pool.end());

  it('enforces bracket/comma array limits and ignores attacker-controlled isBuffer', () => {
    expect(() =>
      qs.parse('a[]=1,2,3,4', { comma: true, arrayLimit: 3, throwOnLimitExceeded: true }),
    ).toThrow(RangeError);
    expect(() =>
      qs.stringify({ value: { constructor: { isBuffer: 'not-callable' } } }),
    ).not.toThrow();
  });

  it('fails closed for invalid parser limits rather than disabling size enforcement', () => {
    expect(() => express.json({ limit: 'invalid-limit' })).toThrow();
    expect(() => express.json({ limit: Number.NaN })).toThrow();
  });

  it('rejects structured/repeated filters and keeps literal comma search working', async () => {
    for (const query of [
      'status[]=OPEN&status[]=CLOSED',
      'status=OPEN&status=CLOSED',
      'search[constructor][isBuffer]=not-callable',
      'search[a][b][c][d][e][f]=nested',
    ]) {
      const response = await request(app)
        .get(`/api/tickets/queue?${query}`)
        .set(authHeader(admin))
        .expect(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    }
    await request(app)
      .get('/api/tickets/queue?search=one,two&__proto__[polluted]=yes')
      .set(authHeader(admin))
      .expect(200);
    expect(Object.prototype).not.toHaveProperty('polluted');
  });

  it('retains the 1 MiB JSON bound and sanitized parser-error envelope', async () => {
    for (const body of ['{"broken":', JSON.stringify({ value: 'x'.repeat(1024 * 1024) })]) {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(500);
      // Existing parser failures use the generic error handler; never echo submitted bodies.
      expect(response.body).toEqual({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error.' },
      });
    }
    await request(app).get('/health').expect(200);
  });
});
