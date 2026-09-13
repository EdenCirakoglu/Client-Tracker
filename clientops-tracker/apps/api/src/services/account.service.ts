import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/client';
import { accountTokens, authSessions, bootstrapState, clients, users } from '../db/schema';
import { env } from '../config/env';
import { hashToken } from '../middleware/session';
import { ApiError } from '../utils/http';
import {
  accountUpdateSchema,
  identitySchema,
  invitationSchema,
  passwordSchema,
} from '../validators/accounts';
import { publicUserColumns } from './user.service';
import { sendAccountMail } from './mail.service';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
const invalidLink = () =>
  new ApiError(
    400,
    'LINK_INVALID',
    'This link has expired or has already been used. Request a new link.',
  );
const accountLock = (tx: Transaction) => tx.execute(sql`SELECT pg_advisory_xact_lock(284971, 1)`);
async function revokeUser(tx: Transaction, userId: string) {
  await tx
    .update(authSessions)
    .set({ revokedAt: sql`clock_timestamp()` })
    .where(eq(authSessions.userId, userId));
  await tx
    .update(accountTokens)
    .set({ consumedAt: sql`clock_timestamp()` })
    .where(and(eq(accountTokens.userId, userId), isNull(accountTokens.consumedAt)));
}
async function checkClient(tx: Transaction, clientId: string | null) {
  if (
    clientId &&
    !(await tx.select({ id: clients.id }).from(clients).where(eq(clients.id, clientId)))[0]
  )
    throw new ApiError(400, 'INVALID_CLIENT', 'Choose an existing organisation.');
}
export async function bootstrapAdministrator(
  input: z.infer<typeof identitySchema> & { password: string },
) {
  const data = identitySchema.extend({ password: passwordSchema }).strict().parse(input);
  const passwordHash = await bcrypt.hash(data.password, 12);
  return db.transaction(async (tx) => {
    await accountLock(tx);
    if (
      (await tx.select().from(bootstrapState))[0] ||
      (await tx.select({ id: users.id }).from(users).where(eq(users.role, 'ADMIN')))[0]
    )
      throw new ApiError(
        409,
        'BOOTSTRAP_COMPLETE',
        'An administrator already exists or bootstrap has completed.',
      );
    const [user] = await tx
      .insert(users)
      .values({ name: data.name, email: data.email, passwordHash, role: 'ADMIN' })
      .returning(publicUserColumns);
    await tx.insert(bootstrapState).values({ id: 1 });
    return user;
  });
}
export async function inviteAccount(actorId: string, input: z.infer<typeof invitationSchema>) {
  const data = invitationSchema.parse(input);
  const token = randomBytes(32).toString('hex');
  const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
  const user = await db.transaction(async (tx) => {
    await accountLock(tx);
    const [actor] = await tx.select().from(users).where(eq(users.id, actorId));
    if (!actor || actor.role !== 'ADMIN' || actor.accountStatus !== 'ACTIVE')
      throw new ApiError(403, 'FORBIDDEN', 'Administrator access is required.');
    await checkClient(tx, data.clientId);
    const [existing] = await tx
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .for('update');
    if (existing && existing.accountStatus !== 'INVITED')
      throw new ApiError(409, 'ACCOUNT_EXISTS', 'This account already exists.');
    const [account] = existing
      ? await tx
          .update(users)
          .set({ name: data.name, role: data.role, clientId: data.clientId })
          .where(eq(users.id, existing.id))
          .returning(publicUserColumns)
      : await tx
          .insert(users)
          .values({ ...data, passwordHash, accountStatus: 'INVITED' })
          .returning(publicUserColumns);
    if (!account) throw new Error('Account creation failed.');
    await revokeUser(tx, account.id);
    await tx.insert(accountTokens).values({
      userId: account.id,
      tokenHash: hashToken(token),
      kind: 'INVITATION',
      expiresAt: new Date(Date.now() + 86400000),
    });
    return account;
  });
  try {
    await sendAccountMail(data.email, token, 'INVITATION');
  } catch {
    throw new ApiError(
      503,
      'MAIL_UNAVAILABLE',
      'Invitation saved, but email delivery failed. Retry the invitation to send a new link.',
    );
  }
  return user;
}
export async function requestPasswordReset(email: string) {
  const token = randomBytes(32).toString('hex');
  const eligible = await db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.email, email)).for('update');
    if (!user || user.accountStatus !== 'ACTIVE' || (user.isDemo && !env.DEMO_MODE)) return false;
    // Do not revoke live sessions until proof of mailbox ownership is consumed.
    await tx
      .update(accountTokens)
      .set({ consumedAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(accountTokens.userId, user.id),
          eq(accountTokens.kind, 'PASSWORD_RESET'),
          isNull(accountTokens.consumedAt),
        ),
      );
    await tx.insert(accountTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      kind: 'PASSWORD_RESET',
      expiresAt: new Date(Date.now() + 1800000),
    });
    return true;
  });
  if (eligible) await sendAccountMail(email, token, 'PASSWORD_RESET');
}
export async function consumeAccountToken(
  token: string,
  password: string,
  kind: 'INVITATION' | 'PASSWORD_RESET',
) {
  passwordSchema.parse(password);
  const passwordHash = await bcrypt.hash(password, 12);
  return db.transaction(async (tx) => {
    const [hint] = await tx
      .select()
      .from(accountTokens)
      .where(eq(accountTokens.tokenHash, hashToken(token)));
    if (!hint) throw invalidLink();
    // Always lock user before tokens, matching reset, invitation and account editing.
    const [user] = await tx.select().from(users).where(eq(users.id, hint.userId)).for('update');
    if (
      !user ||
      user.accountStatus !== (kind === 'INVITATION' ? 'INVITED' : 'ACTIVE') ||
      (user.isDemo && !env.DEMO_MODE)
    )
      throw invalidLink();
    const [consumed] = await tx
      .update(accountTokens)
      .set({ consumedAt: sql`clock_timestamp()` })
      .where(
        and(
          eq(accountTokens.id, hint.id),
          eq(accountTokens.kind, kind),
          isNull(accountTokens.consumedAt),
          sql`${accountTokens.expiresAt} > clock_timestamp()`,
        ),
      )
      .returning();
    if (!consumed) throw invalidLink();
    await tx
      .update(users)
      .set({
        passwordHash,
        accountStatus: 'ACTIVE',
        authVersion: sql`${users.authVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));
    await revokeUser(tx, user.id);
  });
}
export async function changePassword(userId: string, currentPassword: string, password: string) {
  const [hint] = await db.select().from(users).where(eq(users.id, userId));
  if (!hint || !(await bcrypt.compare(currentPassword, hint.passwordHash)))
    throw new ApiError(400, 'INVALID_PASSWORD', 'Current password is incorrect.');
  const passwordHash = await bcrypt.hash(passwordSchema.parse(password), 12);
  await db.transaction(async (tx) => {
    const [current] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (
      !current ||
      current.accountStatus !== 'ACTIVE' ||
      current.passwordHash !== hint.passwordHash ||
      current.authVersion !== hint.authVersion
    )
      throw new ApiError(409, 'ACCOUNT_CHANGED', 'Account changed. Please sign in again.');
    await tx
      .update(users)
      .set({ passwordHash, authVersion: sql`${users.authVersion} + 1`, updatedAt: new Date() })
      .where(eq(users.id, userId));
    await revokeUser(tx, userId);
  });
}
export async function updateAccount(
  actorId: string,
  userId: string,
  input: z.infer<typeof accountUpdateSchema>,
) {
  const data = accountUpdateSchema.parse(input);
  return db.transaction(async (tx) => {
    await accountLock(tx);
    // Recheck the acting administrator within the account-management lock.
    const [actor] = await tx.select().from(users).where(eq(users.id, actorId));
    if (!actor || actor.role !== 'ADMIN' || actor.accountStatus !== 'ACTIVE')
      throw new ApiError(403, 'FORBIDDEN', 'Administrator access is required.');
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).for('update');
    if (!user) throw new ApiError(404, 'NOT_FOUND', 'Account not found.');
    if (userId === actorId && (data.disabled || data.role !== 'ADMIN'))
      throw new ApiError(
        400,
        'SELF_LOCKOUT',
        'Another administrator must change your administrator access.',
      );
    if (user.accountStatus === 'INVITED')
      throw new ApiError(
        400,
        'INVITATION_PENDING',
        'Resend the invitation to change a pending account.',
      );
    await checkClient(tx, data.clientId);
    const [updated] = await tx
      .update(users)
      .set({
        role: data.role,
        clientId: data.clientId,
        accountStatus: data.disabled ? 'DISABLED' : 'ACTIVE',
        authVersion: sql`${users.authVersion} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
      .returning({ ...publicUserColumns, accountStatus: users.accountStatus });
    await revokeUser(tx, userId);
    return updated;
  });
}
export const listAccounts = () =>
  db
    .select({ ...publicUserColumns, accountStatus: users.accountStatus })
    .from(users)
    .orderBy(users.name);
