import { Router } from 'express';

import {
  createClientController,
  getClientController,
  listClientsController,
  updateClientController,
} from '../controllers/client.controller';
import { authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import { createClientBodySchema, idParamsSchema, updateClientBodySchema } from '../validators/api';

export const clientsRouter = Router();

clientsRouter.get('/', listClientsController);
clientsRouter.post(
  '/',
  authorizeRoles('ADMIN'),
  validateRequest({ body: createClientBodySchema }),
  createClientController,
);
clientsRouter.get('/:id', validateRequest({ params: idParamsSchema }), getClientController);
clientsRouter.patch(
  '/:id',
  authorizeRoles('ADMIN'),
  validateRequest({ params: idParamsSchema, body: updateClientBodySchema }),
  updateClientController,
);
