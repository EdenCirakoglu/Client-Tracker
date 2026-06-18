import {
  createClient,
  getClientForUser,
  listClientsForUser,
  updateClient,
} from '../services/client.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';
import { getIdParam } from '../utils/request';

export const listClientsController = asyncHandler(async (req, res) => {
  const clients = await listClientsForUser(requireUser(req));
  sendSuccess(res, clients);
});

export const createClientController = asyncHandler(async (req, res) => {
  const client = await createClient(req.body);
  sendSuccess(res, client, 201);
});

export const getClientController = asyncHandler(async (req, res) => {
  const client = await getClientForUser(requireUser(req), getIdParam(req));
  sendSuccess(res, client);
});

export const updateClientController = asyncHandler(async (req, res) => {
  const client = await updateClient(getIdParam(req), req.body);
  sendSuccess(res, client);
});
