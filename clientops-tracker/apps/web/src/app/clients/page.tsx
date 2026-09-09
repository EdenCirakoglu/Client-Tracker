'use client';

import { useMemo, useState } from 'react';
import { Plus, Save } from 'lucide-react';

import { AccessDenied } from '../../components/access-denied';
import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
import { FieldLabel, Input } from '../../components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { DataTable, Td, Th } from '../../components/ui/table';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import type { Client } from '../../lib/types';
import { useApiData } from '../../lib/use-api-data';

const emptyForm = {
  name: '',
  contactEmail: '',
  phone: '',
};

export default function ClientsPage() {
  const { user } = useAuth();
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const clientsState = useApiData(() => api.clients(), []);
  const projectsState = useApiData(() => api.projects(), []);

  const projectCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const project of projectsState.data ?? []) {
      counts.set(project.clientId, (counts.get(project.clientId) ?? 0) + 1);
    }

    return counts;
  }, [projectsState.data]);

  if (user?.role === 'CLIENT') {
    return (
      <ProtectedPage>
        <AccessDenied />
      </ProtectedPage>
    );
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      if (editing) {
        await api.updateClient(editing.id, {
          name: form.name,
          contactEmail: form.contactEmail,
          phone: form.phone || null,
        });
      } else {
        await api.createClient({
          name: form.name,
          contactEmail: form.contactEmail,
          phone: form.phone || null,
        });
      }

      setEditing(null);
      setForm(emptyForm);
      await clientsState.reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Client could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(client: Client) {
    setEditing(client);
    setForm({
      name: client.name,
      contactEmail: client.contactEmail,
      phone: client.phone ?? '',
    });
  }

  const canManage = user?.role === 'ADMIN';

  return (
    <ProtectedPage>
      <PageHeader description="Client organisations and account contacts." title="Clients" />

      <div
        className={`grid items-start gap-6 ${canManage ? 'xl:grid-cols-[minmax(0,1fr)_340px]' : ''}`}
      >
        <Card>
          <CardHeader title="Client directory" />
          {clientsState.loading ? <LoadingState /> : null}
          {clientsState.error ? (
            <div className="p-5">
              <ErrorState message={clientsState.error} onRetry={clientsState.reload} />
            </div>
          ) : null}
          {clientsState.data && clientsState.data.length > 0 ? (
            <DataTable className="rounded-none border-0">
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Phone</Th>
                  <Th>Projects</Th>
                  <Th>Created</Th>
                  {canManage ? <Th>Actions</Th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {clientsState.data.map((client) => (
                  <tr key={client.id}>
                    <Td className="font-medium text-ink">{client.name}</Td>
                    <Td>{client.contactEmail}</Td>
                    <Td>{client.phone ?? 'Not set'}</Td>
                    <Td>{projectCounts.get(client.id) ?? 0}</Td>
                    <Td>{formatDate(client.createdAt)}</Td>
                    {canManage ? (
                      <Td>
                        <Button onClick={() => startEdit(client)} type="button" variant="secondary">
                          Edit
                        </Button>
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : clientsState.data ? (
            <div className="p-5">
              <EmptyState
                description="Create the first client account to start tracking projects."
                title="No clients found"
              />
            </div>
          ) : null}
        </Card>

        {canManage ? (
          <Card>
            <CardHeader
              title={editing ? 'Edit client' : 'Create client'}
              description="Account contact details."
            />
            <form className="space-y-4 p-5" onSubmit={handleSubmit}>
              <div>
                <FieldLabel htmlFor="clients-name">Name</FieldLabel>
                <Input
                  id="clients-name"
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                  value={form.name}
                />
              </div>
              <div>
                <FieldLabel htmlFor="clients-contact-email">Contact email</FieldLabel>
                <Input
                  id="clients-contact-email"
                  onChange={(event) => setForm({ ...form, contactEmail: event.target.value })}
                  required
                  type="email"
                  value={form.contactEmail}
                />
              </div>
              <div>
                <FieldLabel htmlFor="clients-phone">Phone</FieldLabel>
                <Input
                  id="clients-phone"
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  value={form.phone}
                />
              </div>
              {formError ? (
                <p role="alert" className="text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button disabled={saving} type="submit">
                  {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editing ? 'Save changes' : 'Create client'}
                </Button>
                {editing ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setForm(emptyForm);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </Card>
        ) : null}
      </div>
    </ProtectedPage>
  );
}
