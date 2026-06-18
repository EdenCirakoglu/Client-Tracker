import { eq } from 'drizzle-orm';

import { db } from '../db/client';
import { clients, projects } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';

type CreateProjectInput = {
  clientId: string;
  name: string;
  description?: string | null;
  status?: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
};

type UpdateProjectInput = Partial<Omit<CreateProjectInput, 'clientId'>>;

export async function listProjectsForUser(user: AuthenticatedUser) {
  if (user.role === 'CLIENT') {
    if (!user.clientId) {
      return [];
    }

    return db.select().from(projects).where(eq(projects.clientId, user.clientId));
  }

  return db.select().from(projects).orderBy(projects.name);
}

export async function getProjectForUser(user: AuthenticatedUser, projectId: string) {
  const [project] = await db.select().from(projects).where(eq(projects.id, projectId)).limit(1);

  if (!project || (user.role === 'CLIENT' && project.clientId !== user.clientId)) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
  }

  return project;
}

export async function createProject(data: CreateProjectInput) {
  const [client] = await db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, data.clientId));

  if (!client) {
    throw new ApiError(400, 'INVALID_CLIENT', 'Client does not exist.');
  }

  const [project] = await db
    .insert(projects)
    .values({
      clientId: data.clientId,
      name: data.name,
      description: data.description ?? null,
      status: data.status ?? 'ACTIVE',
    })
    .returning();

  if (!project) {
    throw new ApiError(500, 'PROJECT_CREATE_FAILED', 'Project could not be created.');
  }

  return project;
}

export async function updateProject(projectId: string, data: UpdateProjectInput) {
  const [project] = await db
    .update(projects)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(projects.id, projectId))
    .returning();

  if (!project) {
    throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
  }

  return project;
}
