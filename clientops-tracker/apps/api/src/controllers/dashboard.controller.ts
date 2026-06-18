import { getDashboardMetrics } from '../services/dashboard.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';

export const dashboardMetricsController = asyncHandler(async (req, res) => {
  const metrics = await getDashboardMetrics(requireUser(req));
  sendSuccess(res, metrics);
});
