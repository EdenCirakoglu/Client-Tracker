import { Router } from 'express';
import { databaseReady } from '../db/readiness';
import { asyncHandler } from '../utils/http';

export const healthRouter = Router();

healthRouter.get(
  '/ready',
  asyncHandler(async (_req, res) => {
    const ready = await databaseReady();
    res.set('Cache-Control', 'no-store');
    res
      .status(ready ? 200 : 503)
      .json({ status: ready ? 'ready' : 'unavailable', service: 'clientops-api' });
  }),
);

healthRouter.get('/', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'clientops-api',
    timestamp: new Date().toISOString(),
  });
});
