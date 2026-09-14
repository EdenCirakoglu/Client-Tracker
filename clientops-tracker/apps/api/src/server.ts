import { createApp } from './app';
import { env } from './config/env';
import { startMailWorker } from './services/mail-outbox.service';
import { pool } from './db/client';
import { assertRuntimeRole } from './db/runtime-grants';

const app = createApp();
if (env.NODE_ENV === 'production' && env.DEPLOYMENT_MODE === 'production') {
  try {
    await assertRuntimeRole(pool);
  } catch {
    console.error('Production database role check failed. API not started.');
    await pool.end();
    process.exit(1);
  }
}

app.listen(env.PORT, () => {
  console.log(`ClientOps API listening on port ${env.PORT}`);
  startMailWorker();
});
