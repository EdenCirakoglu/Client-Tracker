import 'dotenv/config';
import { z } from 'zod';
import { assertDisposableDatabase, requireTestDatabase } from '../db/safety';

if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = requireTestDatabase(process.env);
}

const boolean = z.enum(['true', 'false']).transform((value) => value === 'true');
const origin = z
  .string()
  .url()
  .refine(
    (value) => new URL(value).origin === value,
    'Use an origin without a path or trailing slash.',
  );
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DEPLOYMENT_MODE: z.enum(['production', 'disposable']).default('production'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: origin.default('http://localhost:3000'),
  API_ORIGIN: origin.optional(),
  SESSION_SECRET: z.string().min(32).default('clientops_development_session_secret_change_me'),
  SESSION_IDLE_SECONDS: z.coerce.number().int().min(60).max(86400).default(1800),
  SESSION_ABSOLUTE_SECONDS: z.coerce.number().int().min(300).max(604800).default(28800),
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
  DEMO_MODE: boolean.default('false'),
  SMTP_MODE: z.enum(['capture', 'smtp']).default('capture'),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  SMTP_SECURE: boolean.default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  MAIL_FROM: z.string().email().default('clientops@example.com'),
  MAIL_ENCRYPTION_KEY: z
    .string()
    .regex(/^[a-f0-9]{64}$/i)
    .optional(),
});

export const env = envSchema.parse(process.env);

if (
  env.NODE_ENV === 'production' &&
  (!process.env.SESSION_SECRET ||
    /change.?me|replace.?with|development|example|placeholder/i.test(env.SESSION_SECRET) ||
    !env.APP_ORIGIN.startsWith('https://') ||
    (env.API_ORIGIN && !env.API_ORIGIN.startsWith('https://')))
) {
  throw new Error('Production requires a real SESSION_SECRET and HTTPS origins.');
}
if (env.SESSION_IDLE_SECONDS > env.SESSION_ABSOLUTE_SECONDS)
  throw new Error('Idle expiry must not exceed absolute expiry.');
if (env.DEMO_MODE) {
  assertDisposableDatabase(env.DATABASE_URL, process.env.DISPOSABLE_DATABASE_NAME, 'seed');
  if (!['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.APP_ORIGIN).hostname))
    throw new Error('Demo login is restricted to loopback disposable environments.');
}
if (env.SMTP_MODE === 'capture' && !['localhost', '127.0.0.1', 'mailpit'].includes(env.SMTP_HOST))
  throw new Error('Capture mail must use the local mail service.');
if (env.SMTP_MODE === 'smtp' && (!env.SMTP_USER || !env.SMTP_PASSWORD))
  throw new Error('Production SMTP requires credentials.');
if (env.NODE_ENV === 'production' && !env.MAIL_ENCRYPTION_KEY)
  throw new Error('Production requires a separate random MAIL_ENCRYPTION_KEY (32 bytes, hex).');

if (env.NODE_ENV === 'production') {
  if (env.DEPLOYMENT_MODE === 'disposable') {
    assertDisposableDatabase(env.DATABASE_URL, process.env.DISPOSABLE_DATABASE_NAME, 'seed');
    if (
      !['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.APP_ORIGIN).hostname) ||
      env.SMTP_MODE !== 'capture'
    )
      throw new Error(
        'Disposable production-style fixtures require loopback HTTPS and capture mail.',
      );
  } else if (
    env.DEMO_MODE ||
    env.SMTP_MODE !== 'smtp' ||
    process.env.DISPOSABLE_DATABASE_NAME ||
    /(?:demo|test)$/.test(new URL(env.DATABASE_URL).pathname)
  ) {
    throw new Error('Production forbids demo/test databases, demo login and capture SMTP.');
  }
  if (new Set(env.MAIL_ENCRYPTION_KEY).size < 8 || new Set(env.SESSION_SECRET).size < 8)
    throw new Error('Production keys must be independently generated random values.');
}
