import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(8080),
  DATABASE_URL: z
    .string()
    .url()
    .default('postgresql://clientops:clientops_dev_password@localhost:5432/clientops_tracker'),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  JWT_SECRET: z.string().min(32).default('clientops_tracker_development_jwt_secret_change_me'),
});

export const env = envSchema.parse(process.env);
