import { createRequire } from 'node:module';
import { gzipSync } from 'node:zlib';
import express from 'express';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { errorHandler } from '../src/middleware/error';
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

  it('returns sanitized 400/413 responses and retains the 1 MiB JSON bound', async () => {
    const cases = [
      {
        body: '{"private":',
        status: 400,
        code: 'INVALID_JSON',
        message: 'Request body must contain valid JSON.',
      },
      {
        body: JSON.stringify({ value: 'x'.repeat(1024 * 1024) }),
        status: 413,
        code: 'PAYLOAD_TOO_LARGE',
        message: 'Request body exceeds the allowed size.',
      },
    ];
    for (const { body, status, code, message } of cases) {
      const response = await request(app)
        .post('/api/auth/login')
        .set('Content-Type', 'application/json')
        .send(body)
        .expect(status);
      expect(response.body).toEqual({ error: { code, message } });
    }
    await request(app).get('/health').expect(200);
  });

  it('does not trust arbitrary statuses or unrecognized parser-shaped errors', async () => {
    for (const fields of [
      { status: 400 },
      { status: 413, statusCode: 413 },
      { type: 'entity.parse.failed', status: 400, statusCode: 400 },
      { type: 'entity.too.large', status: 500, statusCode: 500 },
    ]) {
      const failure = Object.assign(new Error('Private submitted body, SQL or credential'), fields);
      const isolated = express();
      isolated.get('/', (_req, _res, next) => next(failure));
      isolated.use(errorHandler);
      const response = await request(isolated).get('/').expect(500);
      expect(response.body).toEqual({
        error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error.' },
      });
    }
  });

  it('handles a compressed frame with trailing garbage without an unhandled stream error', async () => {
    const isolated = express();
    isolated.use(express.json({ limit: '1mb' }));
    isolated.post('/', (_req, res) => res.sendStatus(204));
    isolated.use(errorHandler);
    const body = Buffer.concat([gzipSync('{"fixture":true}'), Buffer.from('invalid-trailer')]);
    const response = await request(isolated)
      .post('/')
      .set('Content-Type', 'application/json')
      .set('Content-Encoding', 'gzip')
      .send(body);
    // Decoder errors stay generic; the process must remain available after rejection.
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_SERVER_ERROR', message: 'Unexpected server error.' },
    });
    await request(isolated).post('/').send({ fixture: true }).expect(204);
  });
});
