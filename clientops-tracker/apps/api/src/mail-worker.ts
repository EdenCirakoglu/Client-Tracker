import { startMailWorker } from './services/mail-outbox.service';
import { pool } from './db/client';

const stop = startMailWorker(true);
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    stop();
    void pool.end().finally(() => process.exit(0));
  });
