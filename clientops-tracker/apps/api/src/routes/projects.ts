import { Router } from 'express';

import {
  createProjectController,
  getProjectController,
  listProjectsController,
  updateProjectController,
} from '../controllers/project.controller';
import { authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createProjectBodySchema,
  idParamsSchema,
  updateProjectBodySchema,
} from '../validators/api';

export const projectsRouter = Router();

projectsRouter.get('/', listProjectsController);
projectsRouter.post(
  '/',
  authorizeRoles('ADMIN'),
  validateRequest({ body: createProjectBodySchema }),
  createProjectController,
);
projectsRouter.get('/:id', validateRequest({ params: idParamsSchema }), getProjectController);
projectsRouter.patch(
  '/:id',
  authorizeRoles('ADMIN'),
  validateRequest({ params: idParamsSchema, body: updateProjectBodySchema }),
  updateProjectController,
);
