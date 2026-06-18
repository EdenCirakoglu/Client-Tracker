import { Router } from 'express';

import { createReleaseController, listReleasesController } from '../controllers/release.controller';
import { authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createReleaseBodySchema } from '../validators/api';

export const releasesRouter = Router();

releasesRouter.get('/', listReleasesController);
releasesRouter.post(
  '/',
  authorizeRoles('ADMIN'),
  validateRequest({ body: createReleaseBodySchema }),
  createReleaseController,
);
