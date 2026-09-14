import { createApp } from './app';
import { env } from './config/env';
import { startMailWorker } from './services/mail-outbox.service';

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`ClientOps API listening on port ${env.PORT}`);
  startMailWorker();
});
