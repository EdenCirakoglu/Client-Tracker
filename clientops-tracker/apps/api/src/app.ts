import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';

import { env } from './config/env';
import { openApiDocument } from './docs/openapi';
import { authenticate } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';
import { authRouter } from './routes/auth';
import { clientsRouter } from './routes/clients';
import { dashboardRouter } from './routes/dashboard';
import { healthRouter } from './routes/health';
import { projectsRouter } from './routes/projects';
import { releasesRouter } from './routes/releases';
import { ticketsRouter } from './routes/tickets';
import { usersRouter } from './routes/users';
import { csrfProtection, sessionMiddleware } from './middleware/session';

export function createApp() {
  const app = express();
  const corsOrigin = [env.APP_ORIGIN, ...(env.API_ORIGIN ? [env.API_ORIGIN] : [])];

  app.disable('x-powered-by');
  app.set('trust proxy', Number(env.TRUST_PROXY));
  app.use(helmet());
  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  if (env.NODE_ENV !== 'test') {
    app.use(morgan('combined'));
  }

  app.get('/', (_req, res) => {
    res.status(200).json({
      data: {
        name: 'ClientOps Tracker API',
        status: 'online',
        docs: '/api/docs',
      },
    });
  });

  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);
  app.use(
    '/api/docs',
    swaggerUi.serve,
    swaggerUi.setup(openApiDocument, {
      swaggerOptions: {
        withCredentials: true,
        requestInterceptor: async (request: {
          method: string;
          headers: Record<string, string>;
          credentials?: string;
        }) => {
          request.credentials = 'include';
          if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
            const response = await fetch('/api/auth/csrf', { credentials: 'include' });
            const data = (await response.json()) as { data: { csrfToken: string } };
            request.headers['X-CSRF-Token'] = data.data.csrfToken;
          }
          return request;
        },
      },
    }),
  );
  app.use(
    '/api',
    sessionMiddleware,
    (_req, res, next) => {
      res.set('Cache-Control', 'no-store');
      next();
    },
    csrfProtection,
  );
  app.use('/api/auth', authRouter);
  app.use('/api/clients', authenticate, clientsRouter);
  app.use('/api/projects', authenticate, projectsRouter);
  app.use('/api/tickets', authenticate, ticketsRouter);
  app.use('/api/releases', authenticate, releasesRouter);
  app.use('/api/dashboard', authenticate, dashboardRouter);
  app.use('/api/users', authenticate, usersRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
