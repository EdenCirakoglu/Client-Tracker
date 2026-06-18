import { desc, eq } from 'drizzle-orm';

import { db } from '../db/client';
import { projects, releases } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';

type CreateReleaseInput = {
  projectId: string;
  version: string;
  title: string;
  notes?: string | null;
  releaseDate?: Date | null;
};

export async function listReleasesForUser(user: AuthenticatedUser) {
  if (user.role === 'CLIENT') {
    if (!user.clientId) {
      return [];
    }

    const rows = await db
      .select({ release: releases, project: projects })
      .from(releases)
      .innerJoin(projects, eq(releases.projectId, projects.id))
      .where(eq(projects.clientId, user.clientId))
      .orderBy(desc(releases.createdAt));

    return rows.map((row) => ({ ...row.release, project: row.project }));
  }

  const rows = await db
    .select({ release: releases, project: projects })
    .from(releases)
    .innerJoin(projects, eq(releases.projectId, projects.id))
    .orderBy(desc(releases.createdAt));

  return rows.map((row) => ({ ...row.release, project: row.project }));
}

export async function createRelease(data: CreateReleaseInput) {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, data.projectId))
    .limit(1);

  if (!project) {
    throw new ApiError(400, 'INVALID_PROJECT', 'Project does not exist.');
  }

  const [release] = await db
    .insert(releases)
    .values({
      projectId: data.projectId,
      version: data.version,
      title: data.title,
      notes: data.notes ?? null,
      releaseDate: data.releaseDate ?? null,
    })
    .returning();

  if (!release) {
    throw new ApiError(500, 'RELEASE_CREATE_FAILED', 'Release could not be created.');
  }

  return release;
}
