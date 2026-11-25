'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, Save } from 'lucide-react';

import { AccessDenied } from '../../components/access-denied';
import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Button } from '../../components/ui/button';
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
  const [message, setMessage] = useState('');
  const submitting = useRef(false);
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
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFormError(null);
    setMessage('');

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

      setMessage(editing ? 'Client updated.' : 'Client created.');
      setEditing(null);
      setForm(emptyForm);
      await clientsState.reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Client could not be saved.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function startEdit(client: Client) {
    setFormError(null);
    setMessage('');
    setEditing(client);
    setForm({
      name: client.name,
      contactEmail: client.contactEmail,
      phone: client.phone ?? '',
    });
    document.getElementById('clients-name')?.focus();
  }

  const canManage = user?.role === 'ADMIN';

  return (
    <ProtectedPage>
      <PageHeader
        description="Client organisations and account contacts."
        title="Clients"
        action={
          canManage ? (
            <a
              href="#client-form"
              aria-disabled={saving}
              onClick={(event) => {
                if (submitting.current) {
                  event.preventDefault();
                  return;
                }
                setEditing(null);
                setForm(emptyForm);
                setFormError(null);
                setMessage('');
                requestAnimationFrame(() => document.getElementById('clients-name')?.focus());
              }}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
            >
              <Plus className="h-4 w-4" />
              Create client
            </a>
          ) : undefined
        }
      />
      {message ? (
        <p role="status" className="mb-4 text-sm text-brand-700">
          {message}
        </p>
      ) : null}

      <div className={canManage ? 'portal-workspace' : ''}>
        <section className="portal-section min-w-0" aria-labelledby="client-directory-title">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="client-directory-title" className="portal-section-title">
              Client directory
            </h2>
            {clientsState.data && !clientsState.loading ? (
              <p className="portal-kicker">{clientsState.data.length} organisations</p>
            ) : null}
          </div>
          {projectsState.error ? (
            <ErrorState
              message={`Project counts unavailable: ${projectsState.error}`}
              onRetry={projectsState.reload}
            />
          ) : null}
          {clientsState.loading ? <LoadingState /> : null}
          {clientsState.error ? (
            <div className="p-5">
              <ErrorState message={clientsState.error} onRetry={clientsState.reload} />
            </div>
          ) : null}
          {!clientsState.loading && clientsState.data && clientsState.data.length > 0 ? (
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
                  <tr key={client.id} className="portal-row">
                    <Td className="font-medium text-ink">{client.name}</Td>
                    <Td>{client.contactEmail}</Td>
                    <Td>{client.phone ?? 'Not set'}</Td>
                    <Td>
                      {projectsState.loading ? (
                        'Loading...'
                      ) : projectsState.error ? (
                        'Unavailable'
                      ) : (
                        <Link
                          className="text-brand-700 underline"
                          href={`/projects?clientId=${client.id}`}
                        >
                          {projectCounts.get(client.id) ?? 0}
                        </Link>
                      )}
                    </Td>
                    <Td>{formatDate(client.createdAt)}</Td>
                    {canManage ? (
                      <Td>
                        <Button
                          disabled={saving}
                          onClick={() => startEdit(client)}
                          type="button"
                          variant="secondary"
                        >
                          Edit
                        </Button>
                      </Td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : !clientsState.loading && clientsState.data ? (
            <div className="p-5">
              <EmptyState
                description={
                  canManage
                    ? 'Create the first client account to start tracking projects.'
                    : 'An administrator can create client organisations.'
                }
                title="No clients found"
              />
            </div>
          ) : null}
        </section>

        {canManage ? (
          <section className="portal-support min-w-0" aria-labelledby="client-form-title">
            <p className="portal-kicker">{editing ? editing.name : 'Account contact details'}</p>
            <h2 id="client-form-title" className="portal-section-title">
              {editing ? 'Edit client' : 'Create client'}
            </h2>
            <form
              id="client-form"
              className="portal-form mt-4 scroll-mt-24 space-y-4"
              onSubmit={handleSubmit}
            >
              <fieldset disabled={saving} className="min-w-0 space-y-4">
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
                  <p role="alert" className="break-words text-sm text-red-700">
                    {formError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button disabled={saving} type="submit">
                    {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editing ? 'Save changes' : 'Create client'}
                  </Button>
                  {editing ? (
                    <Button
                      onClick={() => {
                        setEditing(null);
                        setForm(emptyForm);
                        setFormError(null);
                      }}
                      type="button"
                      variant="secondary"
                    >
                      Cancel
                    </Button>
                  ) : null}
                </div>
              </fieldset>
            </form>
          </section>
        ) : null}
      </div>
    </ProtectedPage>
  );
}
