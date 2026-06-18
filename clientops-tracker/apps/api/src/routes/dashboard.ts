import { Router } from 'express';

import { dashboardMetricsController } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/metrics', dashboardMetricsController);
