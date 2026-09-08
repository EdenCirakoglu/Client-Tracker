import { defineConfig } from 'vitest/config';
import { config } from 'dotenv';
import { requireTestDatabase } from './src/db/safety';

config({ path: '.env.test' });
const testUrl = requireTestDatabase(process.env);

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    fileParallelism: false,
    globalSetup: ['./tests/global-setup.ts'],
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: testUrl,
      TEST_DATABASE_URL: testUrl,
      DISPOSABLE_DATABASE_NAME: process.env.DISPOSABLE_DATABASE_NAME!,
      SEED_RESET: 'true',
      JWT_SECRET: 'disposable_test_jwt_secret_never_use_in_production',
    },
  },
});
