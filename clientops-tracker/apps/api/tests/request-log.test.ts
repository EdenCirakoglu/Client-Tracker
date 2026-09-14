import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { requestLog } from '../src/middleware/request-log';

describe('Redacted operational events', () => {
  it('records outcome without private URL, body or header values', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    try {
      const app = express().use(express.json()).use(requestLog);
      app.post('/api/auth/login', (_req, res) => res.status(401).end());
      await request(app)
        .post('/api/auth/login?token=private-query')
        .set('Authorization', 'private-header')
        .set('Referer', 'https://example.com/private-referrer')
        .send({ email: 'private@example.com', password: 'private-password' })
        .expect(401);
      const output = JSON.parse(log.mock.calls[0]![0] as string);
      expect(output).toMatchObject({
        event: 'security_request',
        action: 'login',
        method: 'POST',
        status: 401,
      });
      expect(JSON.stringify(output)).not.toContain('private');
    } finally {
      log.mockRestore();
    }
  });
});
