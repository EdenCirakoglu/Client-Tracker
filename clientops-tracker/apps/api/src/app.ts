import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { env } from './config/env';
import { errorHandler, notFoundHandler } from './middleware/error';
import { healthRouter } from './routes/health';

export function createApp() {
  const app = express();
  const corsOrigin = env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN;

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'ClientOps Tracker API',
      status: 'online',
    });
  });

  app.use('/health', healthRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

