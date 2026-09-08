import 'dotenv/config';
import { z } from 'zod';
import { requireTestDatabase } from '../db/safety';

if (process.env.NODE_ENV === 'test') {
  process.env.DATABASE_URL = requireTestDatabase(process.env);
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32).default('clientops_tracker_development_jwt_secret_change_me'),
});

export const env = envSchema.parse(process.env);

if (
  env.NODE_ENV === 'production' &&
  (!process.env.JWT_SECRET ||
    /change.?me|development|example|placeholder/i.test(env.JWT_SECRET) ||
    env.CORS_ORIGIN === '*')
) {
  throw new Error('Production requires a real JWT_SECRET and an explicit CORS_ORIGIN.');
}
