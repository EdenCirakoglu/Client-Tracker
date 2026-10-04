import { Router } from 'express';
import { activityQuerySchema, getDashboardActivity } from '../services/activity.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';

import { dashboardMetricsController } from '../controllers/dashboard.controller';
import { deliveryPlanQuery, getDeliveryPlan } from '../services/delivery-plan.service';

export const dashboardRouter = Router();

dashboardRouter.get('/metrics', dashboardMetricsController);
dashboardRouter.get(
  '/delivery',
  asyncHandler(async (req, res) => {
    sendSuccess(res, await getDeliveryPlan(requireUser(req), deliveryPlanQuery.parse(req.query)));
  }),
);
dashboardRouter.get(
  '/activity',
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await getDashboardActivity(requireUser(req), activityQuerySchema.parse(req.query)),
    );
  }),
);
