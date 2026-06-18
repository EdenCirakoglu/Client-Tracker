import { z } from 'zod';

export const idParamsSchema = z.object({
  id: z.string().uuid(),
});

export const loginBodySchema = z.object({
  email: z
    .string()
    .email()
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const createClientBodySchema = z.object({
  name: z.string().trim().min(1).max(160),
  contactEmail: z.string().email().max(255),
  phone: z.string().trim().min(1).max(40).nullable().optional(),
});

export const updateClientBodySchema = createClientBodySchema.partial().refine(hasAtLeastOneKey, {
  message: 'At least one client field must be provided.',
});

export const createProjectBodySchema = z.object({
  clientId: z.string().uuid(),
  name: z.string().trim().min(1).max(160),
  description: z.string().trim().min(1).nullable().optional(),
  status: z.enum(['ACTIVE', 'PAUSED', 'COMPLETED']).optional(),
});

export const updateProjectBodySchema = createProjectBodySchema
  .omit({ clientId: true })
  .partial()
  .refine(hasAtLeastOneKey, {
    message: 'At least one project field must be provided.',
  });

export const createTicketBodySchema = z.object({
  projectId: z.string().uuid(),
  assignedToId: z.string().uuid().nullable().optional(),
  title: z.string().trim().min(1).max(220),
  description: z.string().trim().min(1),
  category: z.enum(['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'SECURITY', 'PERFORMANCE']),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
});

export const updateTicketBodySchema = z
  .object({
    assignedToId: z.string().uuid().nullable().optional(),
    title: z.string().trim().min(1).max(220).optional(),
    description: z.string().trim().min(1).optional(),
    category: z.enum(['BUG', 'FEATURE_REQUEST', 'SUPPORT', 'SECURITY', 'PERFORMANCE']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
    status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING_FOR_CLIENT', 'RESOLVED', 'CLOSED']).optional(),
    resolvedAt: z.coerce.date().nullable().optional(),
  })
  .refine(hasAtLeastOneKey, {
    message: 'At least one ticket field must be provided.',
  });

export const createCommentBodySchema = z.object({
  body: z.string().trim().min(1),
  isInternal: z.boolean().optional(),
});

export const createReleaseBodySchema = z.object({
  projectId: z.string().uuid(),
  version: z.string().trim().min(1).max(50),
  title: z.string().trim().min(1).max(180),
  notes: z.string().trim().min(1).nullable().optional(),
  releaseDate: z.coerce.date().nullable().optional(),
});

function hasAtLeastOneKey(value: object) {
  return Object.keys(value).length > 0;
}
