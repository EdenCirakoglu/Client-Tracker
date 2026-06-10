import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../src/app';

describe('GET /health', () => {
  it('returns the API health status', async () => {
    const response = await request(createApp()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      status: 'ok',
      service: 'clientops-api',
    });
  });
});

