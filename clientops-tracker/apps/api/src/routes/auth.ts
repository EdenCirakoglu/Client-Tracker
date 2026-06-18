import { Router } from 'express';

import { loginController, meController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { loginBodySchema } from '../validators/api';

export const authRouter = Router();

authRouter.post('/login', validateRequest({ body: loginBodySchema }), loginController);
authRouter.get('/me', authenticate, meController);
