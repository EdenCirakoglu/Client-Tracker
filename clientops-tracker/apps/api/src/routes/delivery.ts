import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  decideDelivery,
  exportDeliveryRecord,
  getDeliveryRecord,
  listDeliveryReviewers,
  listDeliveryOwners,
  proposeOutcome,
  requestAcceptance,
} from '../services/delivery.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';
import { idParamsSchema } from '../validators/api';
import {
  deliveryDecisionBody,
  deliveryParams,
  proposeOutcomeBody,
  requestAcceptanceBody,
} from '../validators/delivery';

export const deliveryRouter = Router({ mergeParams: true });
deliveryRouter.use(validateRequest({ params: idParamsSchema }));
deliveryRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    sendSuccess(res, await getDeliveryRecord(requireUser(req), String(req.params.id)));
  }),
);
deliveryRouter.get(
  '/export',
  asyncHandler(async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    sendSuccess(res, await exportDeliveryRecord(requireUser(req), String(req.params.id)));
  }),
);
deliveryRouter.get(
  '/reviewers',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await listDeliveryReviewers(requireUser(req), String(req.params.id)));
  }),
);
deliveryRouter.post(
  '/',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ body: proposeOutcomeBody }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await proposeOutcome(requireUser(req), String(req.params.id), req.body), 201);
  }),
);

deliveryRouter.get(
  '/owners',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await listDeliveryOwners(requireUser(req), String(req.params.id)));
  }),
);
deliveryRouter.post(
  '/:revisionId/request-acceptance',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ params: deliveryParams, body: requestAcceptanceBody }),
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await requestAcceptance(
        requireUser(req),
        String(req.params.id),
        String(req.params.revisionId),
        req.body,
      ),
    );
  }),
);
deliveryRouter.post(
  '/:revisionId/decision',
  authorizeRoles('CLIENT'),
  validateRequest({ params: deliveryParams, body: deliveryDecisionBody }),
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await decideDelivery(
        requireUser(req),
        String(req.params.id),
        String(req.params.revisionId),
        req.body,
      ),
    );
  }),
);
