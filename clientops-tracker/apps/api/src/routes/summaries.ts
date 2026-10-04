import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  generateSummary,
  getSummary,
  listSummaries,
  publishSummary,
  summaryBody,
  summaryListQuery,
} from '../services/summary.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';
import { idParamsSchema } from '../validators/api';

export const summariesRouter = Router();
summariesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    sendSuccess(res, await listSummaries(requireUser(req), summaryListQuery.parse(req.query).page));
  }),
);
summariesRouter.post(
  '/',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ body: summaryBody }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await generateSummary(requireUser(req), req.body), 201);
  }),
);
summariesRouter.get(
  '/:id',
  validateRequest({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await getSummary(requireUser(req), String(req.params.id)));
  }),
);
summariesRouter.post(
  '/:id/publish',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ params: idParamsSchema }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await publishSummary(requireUser(req), String(req.params.id)));
  }),
);
