import type { Express } from 'express';
import request from 'supertest';
import { expect } from 'vitest';

export type SessionAuth = { cookie: string; csrfToken: string };
export const authHeader = (session: SessionAuth) => ({
  Cookie: session.cookie,
  'X-CSRF-Token': session.csrfToken,
});
export async function anonymousSession(app: Express): Promise<SessionAuth> {
  const response = await request(app).get('/api/auth/csrf').expect(200);
  return {
    cookie: String(response.headers['set-cookie']?.[0]).split(';')[0]!,
    csrfToken: response.body.data.csrfToken,
  };
}
export async function loginResponse(app: Express, email: string, password = 'password123') {
  return request(app)
    .post('/api/auth/login')
    .set(authHeader(await anonymousSession(app)))
    .send({ email, password });
}
export async function loginSession(
  app: Express,
  email: string,
  password = 'password123',
): Promise<SessionAuth> {
  const response = await loginResponse(app, email, password);
  expect(response.status).toBe(200);
  return {
    cookie: String(response.headers['set-cookie']?.[0]).split(';')[0]!,
    csrfToken: response.body.data.csrfToken,
  };
}
