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
  const invitation = kind === 'INVITATION';
  const url = `${env.APP_ORIGIN}/${invitation ? 'set-password' : 'reset-password'}#token=${token}`;
  await sendMessage(
    email,
    invitation ? 'Your ClientOps invitation' : 'Reset your ClientOps password',
    `${invitation ? 'Set your password to accept your invitation' : 'Reset your password'}:\n\n${url}\n\nThis single-use link expires ${invitation ? '24 hours' : '30 minutes'} after the original request, not after delivery. If you did not expect this email, ignore it.`,
  );
}

export async function sendWorkflowMail(email: string, href: string, event: string) {
  if (!/^\/(?:tickets|summaries)\/[a-f0-9-]{36}(?:#(?:scope|delivery))?$/.test(href))
    throw new Error('Invalid portal destination');
  const action =
    event === 'SUMMARY_PUBLISHED'
      ? 'A progress update is available'
      : event.endsWith('_DECISION')
        ? 'A client decision has been recorded'
        : 'Your review is requested';
  await sendMessage(
    email,
    `ClientOps: ${action.toLowerCase()}`,
    `${action}. Sign in to review the current record:\n\n${env.APP_ORIGIN}${href}\n\nAccess and decisions may have changed since this notice was queued. Workflow email preferences are available in your account. Account security messages are sent separately.`,
  );
}

async function sendMessage(email: string, subject: string, text: string) {
  if (
    env.SMTP_MODE === 'capture' &&
    !/@(?:example\.com|[a-z0-9.-]+\.(?:example|test))$/i.test(email)
  )
    throw new Error('Local capture only permits fictional recipients.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      transport.sendMail({
        from: env.MAIL_FROM,
        to: email,
        subject,
        text,
      }),
      new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('Delivery deadline exceeded')), 30000);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
