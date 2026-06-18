import { eq } from 'drizzle-orm';

import { db } from '../db/client';
import { clients } from '../db/schema';
import type { AuthenticatedUser } from '../types/auth';
import { ApiError } from '../utils/http';

type CreateClientInput = {
  name: string;
  contactEmail: string;
  phone?: string | null;
};

type UpdateClientInput = Partial<CreateClientInput>;

export async function listClientsForUser(user: AuthenticatedUser) {
  if (user.role === 'CLIENT') {
    if (!user.clientId) {
      return [];
    }

    return db.select().from(clients).where(eq(clients.id, user.clientId));
  }

  return db.select().from(clients).orderBy(clients.name);
}

export async function getClientForUser(user: AuthenticatedUser, clientId: string) {
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId)).limit(1);

  if (!client || (user.role === 'CLIENT' && client.id !== user.clientId)) {
    throw new ApiError(404, 'CLIENT_NOT_FOUND', 'Client was not found.');
  }

  return client;
}

export async function createClient(data: CreateClientInput) {
  const [client] = await db
    .insert(clients)
    .values({
      name: data.name,
      contactEmail: data.contactEmail,
      phone: data.phone ?? null,
    })
    .returning();

  if (!client) {
    throw new ApiError(500, 'CLIENT_CREATE_FAILED', 'Client could not be created.');
  }

  return client;
}

export async function updateClient(clientId: string, data: UpdateClientInput) {
  const [client] = await db
    .update(clients)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(clients.id, clientId))
    .returning();

  if (!client) {
    throw new ApiError(404, 'CLIENT_NOT_FOUND', 'Client was not found.');
  }

  return client;
}
