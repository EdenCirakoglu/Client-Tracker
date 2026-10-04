import { z } from 'zod';

export const deliveryParams = z.object({ id: z.string().uuid(), revisionId: z.string().uuid() });
export const proposeOutcomeBody = z
  .object({
    expectedRevision: z.number().int().min(0).max(99),
    reviewerId: z.string().uuid(),
    outcome: z.string().trim().min(10).max(6000),
    targetDate: z
      .string()
      .date()
      .refine((date) => !date.startsWith('0000-'), 'Use a year from 0001 onward.')
      .nullable()
      .optional(),
    ownerId: z.string().uuid().optional(),
  })
  .strict();
export const requestAcceptanceBody = z
  .object({
    releaseId: z.string().uuid(),
    deliveryNotes: z.string().trim().min(10).max(6000),
  })
  .strict();
export const deliveryDecisionBody = z
  .object({
    decision: z.enum(['AGREED', 'ACCEPTED', 'CHANGES_REQUESTED']),
    feedback: z.string().trim().max(4000).default(''),
  })
  .strict()
  .refine((body) => body.decision !== 'CHANGES_REQUESTED' || body.feedback.length >= 10, {
    path: ['feedback'],
    message: 'Explain what still needs to change (at least 10 characters).',
  });
