import { Router } from 'express';
import { authorizeRoles } from '../middleware/auth';
import { rateLimit } from '../middleware/rate-limit';
import { validateRequest } from '../middleware/validate';
import { accountUpdateSchema, invitationSchema } from '../validators/accounts';
import { idParamsSchema } from '../validators/api';
import { inviteAccount, listAccounts, updateAccount } from '../services/account.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';

export const usersRouter = Router();
usersRouter.use(authorizeRoles('ADMIN'));
usersRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    sendSuccess(res, await listAccounts());
  }),
);
usersRouter.post(
  '/invitations',
  rateLimit('invitations', 30, 3600),
  validateRequest({ body: invitationSchema }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await inviteAccount(requireUser(req).id, req.body), 201);
  }),
);
usersRouter.patch(
  '/:id',
  validateRequest({ params: idParamsSchema, body: accountUpdateSchema }),
  asyncHandler(async (req, res) => {
    sendSuccess(res, await updateAccount(requireUser(req).id, String(req.params.id), req.body));
  }),
);
