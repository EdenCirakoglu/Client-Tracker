import {
  applyLatestTriageSuggestion,
  generateTriageSuggestionForTicket,
} from '../services/triage.service';
import {
  createTicketCommentForUser,
  createTicketForUser,
  getTicketForUser,
  listTicketCommentsForUser,
  listTicketsForUser,
  updateTicketForUser,
} from '../services/ticket.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';
import { getIdParam } from '../utils/request';

export const listTicketsController = asyncHandler(async (req, res) => {
  const tickets = await listTicketsForUser(requireUser(req));
  sendSuccess(res, tickets);
});

export const createTicketController = asyncHandler(async (req, res) => {
  const ticket = await createTicketForUser(requireUser(req), req.body);
  sendSuccess(res, ticket, 201);
});

export const getTicketController = asyncHandler(async (req, res) => {
  const ticket = await getTicketForUser(requireUser(req), getIdParam(req));
  sendSuccess(res, ticket);
});

export const updateTicketController = asyncHandler(async (req, res) => {
  const ticket = await updateTicketForUser(requireUser(req), getIdParam(req), req.body);
  sendSuccess(res, ticket);
});

export const listTicketCommentsController = asyncHandler(async (req, res) => {
  const comments = await listTicketCommentsForUser(requireUser(req), getIdParam(req));
  sendSuccess(res, comments);
});

export const createTicketCommentController = asyncHandler(async (req, res) => {
  const comment = await createTicketCommentForUser(requireUser(req), getIdParam(req), req.body);
  sendSuccess(res, comment, 201);
});

export const generateTriageSuggestionController = asyncHandler(async (req, res) => {
  const suggestion = await generateTriageSuggestionForTicket(requireUser(req), getIdParam(req));
  sendSuccess(res, suggestion, 201);
});

export const applyTriageSuggestionController = asyncHandler(async (req, res) => {
  const result = await applyLatestTriageSuggestion(requireUser(req), getIdParam(req));
  sendSuccess(res, result);
});
