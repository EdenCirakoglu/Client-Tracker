import { RateLimiterPostgres } from 'rate-limiter-flexible';
import request from 'supertest';
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app';
import { pool } from '../src/db/client';
import { sessionStore } from '../src/middleware/session';
import { anonymousSession, authHeader } from './helpers/auth';

describe('Authentication ingress rate limit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  afterAll(() => pool.end());

  it('blocks before session or persistent limiter access and resumes after the window', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const app = createApp();
    const anonymous = await anonymousSession(app);
    for (let index = 1; index < 300; index++)
      await request(app).get('/api/auth/config').expect(200);

    const sessionRead = vi.spyOn(sessionStore, 'get');
    const consume = vi.spyOn(RateLimiterPostgres.prototype, 'consume');
    const response = await request(app)
      .post('/api/auth/login')
      .set(authHeader(anonymous))
      .send({ email: 'missing@accounts.example', password: 'wrong' })
      .expect(429);

    expect(response.body).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: 'Too many attempts. Please wait before trying again.',
      },
    });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
    expect(response.headers.ratelimit).toContain('remaining=0');
    expect(sessionRead).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
    await request(app).get('/health').expect(200);

    vi.setSystemTime(Date.now() + 15 * 60 * 1000 + 1);
    await request(app).get('/api/auth/config').expect(200);
  });

  it('counts requests rejected by CSRF instead of allowing unlimited invalid logins', async () => {
    const app = createApp();
    for (let index = 0; index < 300; index++)
      await request(app).post('/api/auth/login').send({}).expect(403);
    await request(app).post('/api/auth/login').send({}).expect(429);
  });

  it('groups IPv6 clients by subnet while keeping other client quotas independent', async () => {
    const app = createApp();
    app.set('trust proxy', 1);
    for (let index = 0; index < 300; index++)
      await request(app)
        .get('/api/auth/config')
        .set('X-Forwarded-For', '2001:db8:1234:5600::1')
        .expect(200);

    await request(app)
      .get('/api/auth/config')
      .set('X-Forwarded-For', '2001:db8:1234:5601::2')
      .expect(429);
    await request(app)
      .get('/api/auth/config')
      .set('X-Forwarded-For', '2001:db8:1234:5700::1')
      .expect(200);
  });
});
