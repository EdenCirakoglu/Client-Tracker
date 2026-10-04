import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  decideScope,
  getScopeProposals,
  proposeScope,
  scopeDecisionBody,
  scopeProposalBody,
} from '../services/scope.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';
import { idParamsSchema } from '../validators/api';
import { deliveryParams } from '../validators/delivery';

export const scopeRouter = Router({ mergeParams: true });
scopeRouter.use(validateRequest({ params: idParamsSchema }));
scopeRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    sendSuccess(res, await getScopeProposals(requireUser(req), String(req.params.id)));
  }),
);
scopeRouter.post(
  '/',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ body: scopeProposalBody }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await proposeScope(requireUser(req), String(req.params.id), req.body), 201);
  }),
);
scopeRouter.post(
  '/:revisionId/decision',
  authorizeRoles('CLIENT'),
  validateRequest({ params: deliveryParams, body: scopeDecisionBody }),
  asyncHandler(async (req, res) => {
    sendSuccess(
      res,
      await decideScope(
        requireUser(req),
        String(req.params.id),
        String(req.params.revisionId),
        req.body,
      ),
    );
  }),
);
