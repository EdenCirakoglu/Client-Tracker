import { randomUUID } from 'node:crypto';
import { and, asc, eq, isNull, lt, lte, or, sql } from 'drizzle-orm';
import { db } from '../db/client';
import { accountTokens, mailOutbox, users } from '../db/schema';
import { env } from '../config/env';
import { preparePasswordReset } from './account.service';
import { decryptMail, encryptMail, type MailPayload } from './mail-payload';
import { sendAccountMail } from './mail.service';

type Delivery = typeof mailOutbox.$inferSelect;
type SendMail = typeof sendAccountMail;
const owned = (job: Delivery) =>
  and(
    eq(mailOutbox.id, job.id),
    eq(mailOutbox.status, 'SENDING'),
    eq(mailOutbox.leaseId, job.leaseId!),
    sql`${mailOutbox.leaseUntil} > clock_timestamp()`,
  );

async function finish(job: Delivery, status: 'DELIVERED' | 'EXPIRED') {
  await db
    .update(mailOutbox)
    .set({
      status,
      payload: null,
      completedAt: new Date(),
      leaseId: null,
      leaseUntil: null,
      lastError: null,
    })
    .where(owned(job));
}

export async function claimMail(): Promise<Delivery | null> {
  return db.transaction(async (tx) => {
    // Bounded maintenance prevents expired or crashed final attempts retaining ciphertext forever.
    await tx.execute(sql`UPDATE mail_outbox SET status = CASE WHEN expires_at <= clock_timestamp() THEN 'EXPIRED' ELSE 'FAILED' END,
      payload = NULL, lease_id = NULL, lease_until = NULL, completed_at = clock_timestamp()
      WHERE id IN (SELECT id FROM mail_outbox WHERE status IN ('PENDING', 'SENDING')
        AND (lease_until IS NULL OR lease_until < clock_timestamp())
        AND (expires_at <= clock_timestamp() OR attempts >= 8)
        LIMIT 100 FOR UPDATE SKIP LOCKED)`);
    const [row] = await tx
      .select()
      .from(mailOutbox)
      .where(
        and(
          or(
            eq(mailOutbox.status, 'PENDING'),
            and(
              eq(mailOutbox.status, 'SENDING'),
              lt(mailOutbox.leaseUntil, sql`clock_timestamp()`),
            ),
          ),
          lte(mailOutbox.availableAt, sql`clock_timestamp()`),
          sql`${mailOutbox.expiresAt} > clock_timestamp()`,
          lt(mailOutbox.attempts, 8),
        ),
      )
      .orderBy(asc(mailOutbox.availableAt), asc(mailOutbox.id))
      .limit(1)
      .for('update', { skipLocked: true });
    if (!row) return null;
    const [job] = await tx
      .update(mailOutbox)
      .set({
        status: 'SENDING',
        leaseId: randomUUID(),
        leaseUntil: sql`clock_timestamp() + interval '90 seconds'`,
        attempts: sql`${mailOutbox.attempts} + 1`,
      })
      .where(eq(mailOutbox.id, row.id))
      .returning();
    return job!;
  });
}

export async function deliverMail(job: Delivery, send: SendMail = sendAccountMail): Promise<void> {
  try {
    let payload: MailPayload = decryptMail(job.id, job.payload!);
    if (payload.kind === 'RECOVERY_REQUEST') {
      const email = payload.email;
      const prepared = await db.transaction(async (tx) => {
        const [current] = await tx.select().from(mailOutbox).where(owned(job)).for('update');
        if (!current || current.expiresAt <= new Date()) return null;
        const reset = await preparePasswordReset(tx, email, current.expiresAt);
        if (!reset) return null;
        const mail = { kind: 'PASSWORD_RESET' as const, email, token: reset.token };
        await tx
          .update(mailOutbox)
          .set({ kind: mail.kind, tokenId: reset.tokenId, payload: encryptMail(job.id, mail) })
          .where(owned(job));
        return { mail, tokenId: reset.tokenId };
      });
      if (!prepared) return finish(job, 'EXPIRED');
      payload = prepared.mail;
      job.tokenId = prepared.tokenId;
    }
    // Revoked, consumed, superseded, disabled or expired links must not be dispatched.
    const [valid] = await db
      .select({ id: accountTokens.id })
      .from(accountTokens)
      .innerJoin(users, eq(users.id, accountTokens.userId))
      .innerJoin(mailOutbox, eq(mailOutbox.tokenId, accountTokens.id))
      .where(
        and(
          owned(job),
          eq(accountTokens.id, job.tokenId!),
          isNull(accountTokens.consumedAt),
          eq(accountTokens.kind, payload.kind),
          sql`${accountTokens.expiresAt} > clock_timestamp()`,
          sql`${mailOutbox.leaseUntil} > clock_timestamp()`,
          eq(users.accountStatus, payload.kind === 'INVITATION' ? 'INVITED' : 'ACTIVE'),
          env.DEMO_MODE ? undefined : eq(users.isDemo, false),
        ),
      );
    if (!valid) return finish(job, 'EXPIRED');
    await send(payload.email, payload.token, payload.kind);
    await finish(job, 'DELIVERED');
  } catch {
    const terminal = job.attempts >= 8;
    await db
      .update(mailOutbox)
      .set({
        status: terminal ? 'FAILED' : 'PENDING',
        payload: terminal ? null : undefined,
        leaseId: null,
        leaseUntil: null,
        availableAt: new Date(Date.now() + Math.min(3600, 15 * 2 ** (job.attempts - 1)) * 1000),
        completedAt: terminal ? new Date() : null,
        lastError: 'DELIVERY_FAILED',
      })
      .where(owned(job));
    // Never log transport errors: they can include recipients, credentials or message bodies.
    console.error(
      JSON.stringify({
        event: 'mail_delivery_failed',
        jobId: job.id,
        attempt: job.attempts,
        terminal,
      }),
    );
  }
}

export async function drainMail(limit = 5, send: SendMail = sendAccountMail) {
  for (let index = 0; index < limit; index++) {
    const job = await claimMail();
    if (!job) break;
    await deliverMail(job, send);
  }
}

export function startMailWorker(keepAlive = false) {
  let busy = false;
  const tick = async () => {
    if (busy) return;
    busy = true;
    try {
      await drainMail();
    } catch {
      console.error(JSON.stringify({ event: 'mail_worker_unavailable' }));
    } finally {
      busy = false;
    }
  };
  const timer = setInterval(() => void tick(), 2000);
  if (!keepAlive) timer.unref();
  void tick();
  return () => clearInterval(timer);
}

export async function mailDeliveryStatus() {
  const summary = await db
    .select({
      status: mailOutbox.status,
      count: sql<number>`count(*)::int`,
      oldestCreatedAt: sql<string>`min(${mailOutbox.createdAt})`,
    })
    .from(mailOutbox)
    .groupBy(mailOutbox.status);
  const recent = await db
    .select({
      id: mailOutbox.id,
      kind: mailOutbox.kind,
      status: mailOutbox.status,
      attempts: mailOutbox.attempts,
      createdAt: mailOutbox.createdAt,
      availableAt: mailOutbox.availableAt,
      completedAt: mailOutbox.completedAt,
      lastError: mailOutbox.lastError,
    })
    .from(mailOutbox)
    .orderBy(sql`${mailOutbox.createdAt} DESC`, mailOutbox.id)
    .limit(30);
  return { summary, recent };
}
