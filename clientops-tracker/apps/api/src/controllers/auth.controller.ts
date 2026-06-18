import { loginWithPassword } from '../services/auth.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';

export const loginController = asyncHandler(async (req, res) => {
  const result = await loginWithPassword(req.body.email, req.body.password);
  sendSuccess(res, result);
});

export const meController = asyncHandler(async (req, res) => {
  sendSuccess(res, requireUser(req));
});
