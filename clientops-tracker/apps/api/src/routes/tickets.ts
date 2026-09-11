import { Router } from 'express';
import { getTicketQueue, queueQuerySchema } from '../services/queue.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';

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
ticketsRouter.get(
  '/queue',
  asyncHandler(async (req, res) => {
    sendSuccess(res, await getTicketQueue(requireUser(req), queueQuerySchema.parse(req.query)));
  }),
);
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
