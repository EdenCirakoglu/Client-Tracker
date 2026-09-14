import { randomUUID } from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { db, pool } from '../src/db/client';
import { seedDatabase } from '../src/db/seed';
import { accountTokens, mailOutbox, users } from '../src/db/schema';
import { inviteAccount, requestPasswordReset } from '../src/services/account.service';
import { claimMail, deliverMail, drainMail } from '../src/services/mail-outbox.service';
import { decryptMail, encryptMail } from '../src/services/mail-payload';
import { createApp } from '../src/app';
import { anonymousSession, authHeader, loginSession } from './helpers/auth';

const app = createApp();
async function invite() {
  const [admin] = await db.select().from(users).where(eq(users.email, 'admin@example.com'));
  return inviteAccount(admin!.id, {
    name: 'Fictional teammate',
    email: 'queued@accounts.example',
    role: 'DEVELOPER',
    clientId: null,
  });
}
const queued = async () => (await db.select().from(mailOutbox))[0]!;

describe('Durable account mail', () => {
  beforeEach(() => seedDatabase());
  afterAll(() => pool.end());

  it('commits the account, hashed token and encrypted delivery atomically', async () => {
    await invite();
    const job = await queued();
    const payload = decryptMail(job.id, job.payload!);
    expect(payload.kind).toBe('INVITATION');
    expect(job.payload).not.toContain('queued@accounts.example');
    if (payload.kind === 'RECOVERY_REQUEST') throw new Error('Incorrect fixture');
    expect(JSON.stringify(await db.select().from(accountTokens))).not.toContain(payload.token);
    const send = vi.fn().mockResolvedValue(undefined);
    await drainMail(1, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect(send).toHaveBeenCalledWith(payload.email, payload.token, payload.kind);
    expect(await queued()).toMatchObject({ status: 'DELIVERED', payload: null, attempts: 1 });
  });

  it('rolls back invitation creation when durable enqueue fails', async () => {
    await db.execute(
      sql`CREATE FUNCTION reject_mail_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END $$`,
    );
    await db.execute(
      sql`CREATE TRIGGER reject_mail_fixture BEFORE INSERT ON mail_outbox FOR EACH ROW EXECUTE FUNCTION reject_mail_fixture()`,
    );
    try {
      await expect(invite()).rejects.toThrow();
      expect(
        await db.select().from(users).where(eq(users.email, 'queued@accounts.example')),
      ).toHaveLength(0);
    } finally {
      await db.execute(sql`DROP TRIGGER reject_mail_fixture ON mail_outbox`);
      await db.execute(sql`DROP FUNCTION reject_mail_fixture()`);
    }
  });

  it('coordinates simultaneous workers with a single claimed delivery', async () => {
    await invite();
    const send = vi.fn().mockResolvedValue(undefined);
    await Promise.all([drainMail(1, send), drainMail(1, send), drainMail(1, send)]);
    expect(send).toHaveBeenCalledTimes(1);
    expect(await queued()).toMatchObject({ status: 'DELIVERED', attempts: 1 });
  });

  it('recovers a crashed worker lease and fences its stale completion', async () => {
    await invite();
    const old = (await claimMail())!;
    await db.update(mailOutbox).set({ leaseUntil: new Date(Date.now() - 1000) });
    const expiredSend = vi.fn().mockResolvedValue(undefined);
    await deliverMail(old, expiredSend);
    expect(expiredSend).not.toHaveBeenCalled();
    expect((await queued()).status).toBe('SENDING');
    const replacement = (await claimMail())!;
    expect(replacement.leaseId).not.toBe(old.leaseId);
    const send = vi.fn().mockResolvedValue(undefined);
    await deliverMail(old, send);
    expect(send).not.toHaveBeenCalled();
    expect((await queued()).leaseId).toBe(replacement.leaseId);
    await deliverMail(replacement, send);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('persists SMTP failure/backoff and retries the same link without logging it', async () => {
    await invite();
    const original = await queued();
    const payload = decryptMail(original.id, original.payload!);
    const logging = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await drainMail(1, vi.fn().mockRejectedValue(new Error(JSON.stringify(payload))));
      const failed = await queued();
      expect(failed).toMatchObject({
        status: 'PENDING',
        attempts: 1,
        lastError: 'DELIVERY_FAILED',
      });
      expect(failed.availableAt.getTime()).toBeGreaterThan(Date.now());
      expect(JSON.stringify(logging.mock.calls)).not.toContain(payload.email);
      expect(await claimMail()).toBeNull();
      await db.update(mailOutbox).set({ availableAt: new Date(Date.now() - 1000) });
      const send = vi.fn().mockResolvedValue(undefined);
      await deliverMail((await claimMail())!, send);
      if (payload.kind === 'RECOVERY_REQUEST') throw new Error('Incorrect fixture');
      expect(send).toHaveBeenCalledTimes(1);
      expect(send).toHaveBeenCalledWith(payload.email, payload.token, 'INVITATION');
      expect((await queued()).attempts).toBe(2);
    } finally {
      logging.mockRestore();
    }
  });

  it('does not send expired, consumed, disabled or superseded invitations', async () => {
    const user = await invite();
    await db.update(accountTokens).set({ consumedAt: new Date() });
    const send = vi.fn().mockResolvedValue(undefined);
    await drainMail(1, send);
    expect(send).not.toHaveBeenCalled();
    await invite();
    await db.update(users).set({ accountStatus: 'DISABLED' }).where(eq(users.id, user.id));
    await drainMail(1, send);
    expect(send).not.toHaveBeenCalled();
    await db.update(users).set({ accountStatus: 'INVITED' }).where(eq(users.id, user.id));
    await invite();
    await db.update(mailOutbox).set({ expiresAt: new Date(Date.now() - 1000) });
    await drainMail(1, send);
    expect(send).not.toHaveBeenCalled();
    expect((await db.select().from(mailOutbox)).every((row) => row.payload === null)).toBe(true);
    await invite();
    await invite();
    await drainMail(5, send);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('durably accepts identical recovery requests without disclosing account existence', async () => {
    const anonymous = await anonymousSession(app);
    const known = await request(app)
      .post('/api/auth/forgot-password')
      .set(authHeader(anonymous))
      .send({ email: 'admin@example.com' })
      .expect(202);
    const unknown = await request(app)
      .post('/api/auth/forgot-password')
      .set(authHeader(anonymous))
      .send({ email: 'absent@accounts.example' })
      .expect(202);
    expect(known.body).toEqual(unknown.body);
    expect(await db.select().from(mailOutbox)).toHaveLength(2);
    expect(await db.select().from(accountTokens)).toHaveLength(0);
    const send = vi.fn().mockResolvedValue(undefined);
    await drainMail(5, send);
    expect(send).toHaveBeenCalledTimes(1);
    expect((await db.select().from(mailOutbox)).every((row) => row.payload === null)).toBe(true);
  });

  it('authenticates payloads to their job and exposes only bounded redacted administrator status', async () => {
    await invite();
    const job = await queued();
    expect(() => decryptMail(randomUUID(), job.payload!)).toThrow();
    const payload = decryptMail(job.id, job.payload!);
    expect(encryptMail(job.id, payload)).not.toBe(job.payload);
    await db.update(mailOutbox).set({ attempts: 7, payload: 'corrupt' });
    const logging = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      await drainMail();
    } finally {
      logging.mockRestore();
    }
    expect(await queued()).toMatchObject({ status: 'FAILED', payload: null, attempts: 8 });
    const admin = await loginSession(app, 'admin@example.com');
    const response = await request(app)
      .get('/api/users/deliveries')
      .set(authHeader(admin))
      .expect(200);
    expect(response.body.data.recent).toHaveLength(1);
    expect(JSON.stringify(response.body)).not.toContain('payload');
    expect(JSON.stringify(response.body)).not.toContain('queued@accounts.example');
    const client = await loginSession(app, 'client@example.com');
    await request(app).get('/api/users/deliveries').set(authHeader(client)).expect(403);
  });

  it('expires stale recovery requests before creating or sending any token', async () => {
    await requestPasswordReset('admin@example.com');
    await db.update(mailOutbox).set({ expiresAt: new Date(Date.now() - 1000) });
    const send = vi.fn().mockResolvedValue(undefined);
    await drainMail(1, send);
    expect(send).not.toHaveBeenCalled();
    expect(await db.select().from(accountTokens)).toHaveLength(0);
    expect(await queued()).toMatchObject({ status: 'EXPIRED', payload: null });
  });
});
