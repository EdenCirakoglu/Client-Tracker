import { Router } from 'express';

import { loginController, meController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { loginBodySchema } from '../validators/api';
import { env } from '../config/env';
import { csrfToken, revokeSession, saveSession } from '../middleware/session';
import { rateLimit } from '../middleware/rate-limit';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';
import { emailSchema, passwordChangeSchema, tokenPasswordSchema } from '../validators/accounts';
import {
  changePassword,
  consumeAccountToken,
  requestPasswordReset,
} from '../services/account.service';
import { z } from 'zod';

export const authRouter = Router();

authRouter.get('/config', (_req, res) => sendSuccess(res, { demoEnabled: env.DEMO_MODE }));
authRouter.get(
  '/csrf',
  rateLimit('csrf', 200, 900),
  asyncHandler(async (req, res) => {
    const token = csrfToken(req);
    await saveSession(req);
    sendSuccess(res, { csrfToken: token });
  }),
);
authRouter.post(
  '/login',
  rateLimit('login-ip', 100, 900),
  rateLimit('login-email', 20, 900, true),
  validateRequest({ body: loginBodySchema }),
  loginController,
);
authRouter.get('/me', authenticate, meController);
authRouter.post(
  '/logout',
  asyncHandler(async (req, res) => {
    await revokeSession(req, res);
    sendSuccess(res, { message: 'Signed out.' });
  }),
);
authRouter.post(
  '/forgot-password',
  rateLimit('recovery-ip', 20, 3600),
  rateLimit('recovery-email', 5, 3600, true),
  validateRequest({ body: z.object({ email: emailSchema }).strict() }),
  asyncHandler((req, res) => {
    // Identical response precedes mailbox lookup/delivery, avoiding SMTP timing enumeration.
    sendSuccess(
      res,
      { message: 'If this account can sign in, a password reset link will be sent.' },
      202,
    );
    void requestPasswordReset(req.body.email).catch(() =>
      console.error('Password recovery delivery failed.'),
    );
  }),
);
authRouter.post(
  '/accept-invitation',
  rateLimit('invitation-consume', 30, 900),
  validateRequest({ body: tokenPasswordSchema }),
  asyncHandler(async (req, res) => {
    await consumeAccountToken(req.body.token, req.body.password, 'INVITATION');
    sendSuccess(res, { message: 'Account ready. Sign in with your new password.' });
  }),
);
authRouter.post(
  '/reset-password',
  rateLimit('reset-consume', 30, 900),
  validateRequest({ body: tokenPasswordSchema }),
  asyncHandler(async (req, res) => {
    await consumeAccountToken(req.body.token, req.body.password, 'PASSWORD_RESET');
    sendSuccess(res, { message: 'Password reset. All previous sessions have ended.' });
  }),
);
authRouter.post(
  '/change-password',
  authenticate,
  rateLimit('password-change', 10, 900),
  validateRequest({ body: passwordChangeSchema }),
  asyncHandler(async (req, res) => {
    await changePassword(requireUser(req).id, req.body.currentPassword, req.body.password);
    await revokeSession(req, res);
    sendSuccess(res, { message: 'Password changed. Sign in again.' });
  }),
);
