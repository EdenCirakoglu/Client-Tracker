import { Router } from 'express';

import {
  applyTriageSuggestionController,
  createTicketCommentController,
  createTicketController,
  generateTriageSuggestionController,
  getTicketController,
  listTicketCommentsController,
  listTicketsController,
  updateTicketController,
} from '../controllers/ticket.controller';
import { authorizeRoles } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createCommentBodySchema,
  createTicketBodySchema,
  idParamsSchema,
  updateTicketBodySchema,
} from '../validators/api';

export const ticketsRouter = Router();

ticketsRouter.get('/', listTicketsController);
ticketsRouter.post('/', validateRequest({ body: createTicketBodySchema }), createTicketController);
ticketsRouter.get('/:id', validateRequest({ params: idParamsSchema }), getTicketController);
ticketsRouter.patch(
  '/:id',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ params: idParamsSchema, body: updateTicketBodySchema }),
  updateTicketController,
);
ticketsRouter.post(
  '/:id/triage-suggestion',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ params: idParamsSchema }),
  generateTriageSuggestionController,
);
ticketsRouter.patch(
  '/:id/apply-triage-suggestion',
  authorizeRoles('ADMIN', 'DEVELOPER'),
  validateRequest({ params: idParamsSchema }),
  applyTriageSuggestionController,
);
ticketsRouter.get(
  '/:id/comments',
  validateRequest({ params: idParamsSchema }),
  listTicketCommentsController,
);
ticketsRouter.post(
  '/:id/comments',
  validateRequest({ params: idParamsSchema, body: createCommentBodySchema }),
  createTicketCommentController,
);
