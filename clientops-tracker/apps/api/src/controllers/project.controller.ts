import {
  createProject,
  getProjectForUser,
  listProjectsForUser,
  updateProject,
} from '../services/project.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';
import { getIdParam } from '../utils/request';

export const listProjectsController = asyncHandler(async (req, res) => {
  const projects = await listProjectsForUser(requireUser(req));
  sendSuccess(res, projects);
});

export const createProjectController = asyncHandler(async (req, res) => {
  const project = await createProject(req.body);
  sendSuccess(res, project, 201);
});

export const getProjectController = asyncHandler(async (req, res) => {
  const project = await getProjectForUser(requireUser(req), getIdParam(req));
  sendSuccess(res, project);
});

export const updateProjectController = asyncHandler(async (req, res) => {
  const project = await updateProject(getIdParam(req), req.body);
  sendSuccess(res, project);
});
