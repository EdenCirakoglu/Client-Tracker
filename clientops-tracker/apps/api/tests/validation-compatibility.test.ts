import express from 'express';
import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { pool } from '../src/db/client';
import { errorHandler } from '../src/middleware/error';
import { validateRequest } from '../src/middleware/validate';
import { publishSummaryBody, summaryBody, summaryListQuery } from '../src/services/summary.service';
import { deliveryDecisionBody, proposeOutcomeBody } from '../src/validators/delivery';

const id = 'e9a69201-7771-4fb8-bfb8-55e622aa1cc5';

describe('Zod 4 request contract compatibility', () => {
  afterAll(() => pool.end());

  it('retains omitted defaults, coercion, trimming and strict object validation', () => {
    expect(publishSummaryBody.parse({})).toEqual({ recipientIds: [] });
    expect(summaryListQuery.parse({ page: '2' })).toEqual({ page: 2 });
    expect(summaryListQuery.parse({})).toEqual({ page: 1 });
    expect(deliveryDecisionBody.parse({ decision: 'AGREED' })).toEqual({
      decision: 'AGREED',
      feedback: '',
    });
    const outcome = proposeOutcomeBody.parse({
      expectedRevision: 0,
      reviewerId: id,
      outcome: '  Find archived shipments.  ',
      targetDate: null,
    });
    expect(outcome.outcome).toBe('Find archived shipments.');
    expect(outcome.targetDate).toBeNull();
    expect(proposeOutcomeBody.safeParse({ ...outcome, role: 'ADMIN' }).success).toBe(false);
    expect(proposeOutcomeBody.safeParse({ ...outcome, targetDate: '2026-02-30' }).success).toBe(
      false,
    );
    expect(deliveryDecisionBody.safeParse({ decision: 'CHANGES_REQUESTED' }).success).toBe(false);
  });

  it('rejects oversized collections before expanding individual invalid-entry errors', () => {
    // Bounded fixtures exercise the advisory without attempting resource exhaustion.
    const recipients = publishSummaryBody.safeParse({ recipientIds: Array(51).fill({}) });
    expect(recipients.success).toBe(false);
    if (!recipients.success) {
      expect(recipients.error.issues).toHaveLength(1);
      expect(recipients.error.issues[0]?.code).toBe('too_big');
    }
    const summary = summaryBody.safeParse({
      clientId: id,
      weekStart: '2026-01-01',
      upcoming: Array(21).fill({}),
    });
    expect(summary.success).toBe(false);
    if (!summary.success) expect(summary.error.issues).toHaveLength(1);
  });

  it('keeps field-associated validation errors without returning submitted values', async () => {
    const isolated = express();
    isolated.use(express.json({ limit: '1mb' }));
    isolated.post('/', validateRequest({ body: proposeOutcomeBody }), (_req, res) =>
      res.sendStatus(204),
    );
    isolated.use(errorHandler);
    const response = await request(isolated)
      .post('/')
      .send({
        expectedRevision: 0,
        reviewerId: 'private-not-a-uuid',
        outcome: 'short',
      })
      .expect(400);
    expect(response.body.error.code).toBe('VALIDATION_ERROR');
    expect(response.body.error.details.fieldErrors).toHaveProperty('reviewerId');
    expect(response.body.error.details.fieldErrors).toHaveProperty('outcome');
    expect(JSON.stringify(response.body)).not.toContain('private-not-a-uuid');
  });
});
