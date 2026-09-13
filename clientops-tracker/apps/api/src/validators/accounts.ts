import { z } from 'zod';

export const emailSchema = z
  .string()
  .trim()
  .email()
  .max(255)
  .transform((value) => value.toLowerCase());
export const passwordSchema = z
  .string()
  .min(12, 'Use at least 12 characters.')
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'Use no more than 72 UTF-8 bytes.');
export const identitySchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: emailSchema,
});
export const assignmentSchema = z
  .object({
    role: z.enum(['ADMIN', 'DEVELOPER', 'CLIENT']),
    clientId: z.string().uuid().nullable(),
  })
  .refine(
    (value) => (value.role === 'CLIENT' ? value.clientId !== null : value.clientId === null),
    'Clients require an organisation; internal staff must not have one.',
  );
export const invitationSchema = identitySchema.and(assignmentSchema);
export const tokenPasswordSchema = z
  .object({ token: z.string().regex(/^[a-f0-9]{64}$/), password: passwordSchema })
  .strict();
export const passwordChangeSchema = z
  .object({ currentPassword: z.string().min(1).max(256), password: passwordSchema })
  .strict();
export const accountUpdateSchema = z
  .object({
    role: z.enum(['ADMIN', 'DEVELOPER', 'CLIENT']),
    clientId: z.string().uuid().nullable(),
    disabled: z.boolean(),
  })
  .strict()
  .refine(
    (value) => (value.role === 'CLIENT' ? value.clientId !== null : value.clientId === null),
    'Clients require an organisation; internal staff must not have one.',
  );
