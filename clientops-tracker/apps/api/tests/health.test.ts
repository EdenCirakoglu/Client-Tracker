import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { databaseUnavailable, readinessPool } from '../src/db/readiness';

import { createApp } from '../src/app';

describe('GET /health', () => {
  afterAll(() => readinessPool.end());
  it('returns the API health status', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'clientops-api',
    });
  });

  it('reports database readiness separately from process liveness', async () => {
    await request(createApp()).get('/api/health/ready').expect(200);
    const query = vi
      .spyOn(readinessPool, 'query')
      .mockRejectedValueOnce(new Error('private connection detail') as never);
    const response = await request(createApp()).get('/api/health/ready').expect(503);
    expect(response.body).toEqual({ status: 'unavailable', service: 'clientops-api' });
    await request(createApp()).get('/health').expect(200);
    query.mockRestore();
    await request(createApp()).get('/health/ready').expect(200);
  });

  it('recognises wrapped network/database timeouts without leaking error details', () => {
    expect(databaseUnavailable({ cause: { code: 'ECONNREFUSED' } })).toBe(true);
    expect(databaseUnavailable({ code: '57P01' })).toBe(true);
    expect(databaseUnavailable({ message: 'Query read timeout' })).toBe(true);
    expect(databaseUnavailable({ code: '23505' })).toBe(false);
  });
});
