import { Router } from 'express';
import { activityQuerySchema, getDashboardActivity } from '../services/activity.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';

import { dashboardMetricsController } from '../controllers/dashboard.controller';

export const dashboardRouter = Router();

dashboardRouter.get('/metrics', dashboardMetricsController);
dashboardRouter.get(
  '/activity',
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await getDashboardActivity(requireUser(req), activityQuerySchema.parse(req.query)),
    );
  }),
);
