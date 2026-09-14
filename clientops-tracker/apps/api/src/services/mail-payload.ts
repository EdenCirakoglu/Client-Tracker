import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env';
import { db } from '../db/client';
import { mailOutbox } from '../db/schema';

const payloadSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('RECOVERY_REQUEST'), email: z.string().email() }).strict(),
  z
    .object({
      kind: z.enum(['INVITATION', 'PASSWORD_RESET']),
      email: z.string().email(),
      token: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
]);
export type MailPayload = z.infer<typeof payloadSchema>;
export type MailTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const key = env.MAIL_ENCRYPTION_KEY
  ? Buffer.from(env.MAIL_ENCRYPTION_KEY, 'hex')
  : createHash('sha256').update(`local-mail:${env.SESSION_SECRET}`).digest();

export function encryptMail(id: string, payload: MailPayload): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(`clientops-mail-v1:${id}`));
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payloadSchema.parse(payload)), 'utf8'),
    cipher.final(),
  ]);
  return [
    'v1',
    iv.toString('base64'),
    cipher.getAuthTag().toString('base64'),
    ciphertext.toString('base64'),
  ].join('.');
}
export function decryptMail(id: string, value: string): MailPayload {
  const [version, iv, tag, ciphertext, extra] = value.split('.');
  if (version !== 'v1' || !iv || !tag || !ciphertext || extra)
    throw new Error('Invalid mail envelope');
  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'), {
    authTagLength: 16,
  });
  decipher.setAAD(Buffer.from(`clientops-mail-v1:${id}`));
  decipher.setAuthTag(Buffer.from(tag, 'base64'));
  return payloadSchema.parse(
    JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(ciphertext, 'base64')),
        decipher.final(),
      ]).toString('utf8'),
    ),
  );
}
export async function enqueueMail(
  tx: MailTransaction | typeof db,
  payload: MailPayload,
  expiresAt: Date,
  tokenId?: string,
) {
  const id = randomUUID();
  await tx
    .insert(mailOutbox)
    .values({ id, kind: payload.kind, payload: encryptMail(id, payload), expiresAt, tokenId });
  return id;
}
