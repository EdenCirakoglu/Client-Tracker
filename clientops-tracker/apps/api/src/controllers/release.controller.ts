import { createRelease, listReleasesForUser } from '../services/release.service';
import { asyncHandler, requireUser, sendSuccess } from '../utils/http';

export const listReleasesController = asyncHandler(async (req, res) => {
  const releases = await listReleasesForUser(requireUser(req));
  sendSuccess(res, releases);
});

export const createReleaseController = asyncHandler(async (req, res) => {
  const release = await createRelease(req.body);
  sendSuccess(res, release, 201);
});
