import nodemailer from 'nodemailer';
import { env } from '../config/env';

const transport = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: env.SMTP_SECURE,
  requireTLS: env.SMTP_MODE === 'smtp' && !env.SMTP_SECURE,
  auth: env.SMTP_MODE === 'smtp' ? { user: env.SMTP_USER!, pass: env.SMTP_PASSWORD! } : undefined,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});
export async function sendAccountMail(
  email: string,
  token: string,
  kind: 'INVITATION' | 'PASSWORD_RESET',
) {
  if (
    env.SMTP_MODE === 'capture' &&
    !/@(?:example\.com|[a-z0-9.-]+\.(?:example|test))$/i.test(email)
  )
    throw new Error('Local capture only permits fictional recipients.');
  const invitation = kind === 'INVITATION';
  const url = `${env.APP_ORIGIN}/${invitation ? 'set-password' : 'reset-password'}#token=${token}`;
  await transport.sendMail({
    from: env.MAIL_FROM,
    to: email,
    subject: invitation ? 'Your ClientOps invitation' : 'Reset your ClientOps password',
    text: `${invitation ? 'Set your password to accept your invitation' : 'Reset your password'}:\n\n${url}\n\nThis single-use link expires in ${invitation ? '24 hours' : '30 minutes'}. If you did not expect this email, ignore it.`,
  });
}
