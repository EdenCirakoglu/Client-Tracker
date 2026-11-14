'use client';
import Link from 'next/link';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Plus, Save } from 'lucide-react';

import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { FieldLabel, Input, Select, Textarea } from '../../components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { DataTable, Td, Th } from '../../components/ui/table';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, titleCase } from '../../lib/format';
import { projectStatuses } from '../../lib/options';
import type { Project, ProjectStatus } from '../../lib/types';
import { useApiData } from '../../lib/use-api-data';

const emptyProjectForm = {
  clientId: '',
  name: '',
  description: '',
  status: 'ACTIVE' as ProjectStatus,
};

function Projects() {
  const params = useSearchParams();
  const selectedClient = params.get('clientId') ?? '';
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyProjectForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const submitting = useRef(false);
  const projectsState = useApiData(() => api.projects(), []);
  const clientsState = useApiData(() => api.clients(), []);
  useEffect(() => {
    if (!selectedClient) {
      setClientFilter('ALL');
    } else if (clientsState.data?.some((client) => client.id === selectedClient)) {
      setClientFilter(selectedClient);
      setForm((value) => ({ ...value, clientId: selectedClient }));
    }
  }, [selectedClient, clientsState.data]);

  const clientById = useMemo(
    () => new Map((clientsState.data ?? []).map((client) => [client.id, client])),
    [clientsState.data],
  );

  const filteredProjects = useMemo(() => {
    return (projectsState.data ?? []).filter((project) => {
      const statusMatches = statusFilter === 'ALL' || project.status === statusFilter;
      const clientMatches = clientFilter === 'ALL' || project.clientId === clientFilter;
      return statusMatches && clientMatches;
    });
  }, [clientFilter, projectsState.data, statusFilter]);

  const canManage = user?.role === 'ADMIN';
  const internalUser = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFormError(null);
    setMessage('');

    try {
      if (editing) {
        await api.updateProject(editing.id, {
          name: form.name,
          description: form.description || null,
          status: form.status,
        });
      } else {
        await api.createProject({
          clientId: form.clientId,
          name: form.name,
          description: form.description || null,
          status: form.status,
        });
      }

      setEditing(null);
      setForm({ ...emptyProjectForm, clientId: selectedClient });
      setMessage(
        editing
          ? 'Project updated.'
          : 'Project created. You can now invite a client contact or record a request.',
      );
      await projectsState.reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Project could not be saved.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  function startEdit(project: Project) {
    setFormError(null);
    setMessage('');
    setEditing(project);
    setForm({
      clientId: project.clientId,
      name: project.name,
      description: project.description ?? '',
      status: project.status,
    });
    document.getElementById('projects-name')?.focus();
  }

  return (
    <ProtectedPage>
      <PageHeader
        description="Delivery status and project ownership."
        title="Projects"
        action={
          canManage ? (
            <a
              href="#project-form"
              aria-disabled={saving}
              onClick={(event) => {
                if (submitting.current) {
                  event.preventDefault();
                  return;
                }
                setEditing(null);
                setForm({
                  ...emptyProjectForm,
                  clientId: clientById.has(selectedClient) ? selectedClient : '',
                });
                setFormError(null);
                setMessage('');
                requestAnimationFrame(() => document.getElementById('projects-name')?.focus());
              }}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
            >
              <Plus className="h-4 w-4" />
              Create project
            </a>
          ) : undefined
        }
      />
      {canManage && selectedClient && clientById.has(selectedClient) ? (
        <Link
          className="mb-4 inline-flex min-h-11 items-center text-sm text-brand-700 underline"
          href={`/guide?clientId=${selectedClient}`}
        >
          Back to this client's setup
        </Link>
      ) : null}
      {message ? (
        <p role="status" className="mb-4 text-sm text-brand-700">
          {message}
        </p>
      ) : null}

      {clientsState.error ? (
        <ErrorState
          message={`Client information unavailable: ${clientsState.error}`}
          onRetry={clientsState.reload}
        />
      ) : null}
      <div className="mb-4 grid gap-3 border-b border-border pb-4 sm:grid-cols-2">
        <Select
          aria-label="Filter by status"
          onChange={(event) => setStatusFilter(event.target.value)}
          value={statusFilter}
        >
          <option value="ALL">All statuses</option>
          {projectStatuses.map((status) => (
            <option key={status} value={status}>
              {titleCase(status)}
            </option>
          ))}
        </Select>
        {internalUser ? (
          <Select
            aria-label="Filter by client"
            disabled={clientsState.loading || !!clientsState.error}
            onChange={(event) => setClientFilter(event.target.value)}
            value={clientFilter}
          >
            <option value="ALL">All clients</option>
            {(clientsState.data ?? []).map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </Select>
        ) : null}
      </div>

      <div className={canManage ? 'portal-workspace' : ''}>
        <section className="portal-section min-w-0" aria-labelledby="project-portfolio-title">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="project-portfolio-title" className="portal-section-title">
              Project portfolio
            </h2>
            {projectsState.data && !projectsState.loading ? (
              <p role="status" className="portal-kicker">
                {filteredProjects.length} of {projectsState.data.length} projects
              </p>
            ) : null}
          </div>
          {projectsState.loading ? <LoadingState /> : null}
          {projectsState.error ? (
            <div className="p-5">
              <ErrorState message={projectsState.error} onRetry={projectsState.reload} />
            </div>
          ) : null}
          {!projectsState.loading && projectsState.data && filteredProjects.length > 0 ? (
            <DataTable className="rounded-none border-0">
              <thead>
                <tr>
                  <Th>Project</Th>
                  <Th>Client</Th>
                  <Th>Status</Th>
                  <Th>Description</Th>
                  <Th>Created</Th>
                  {canManage ? <Th>Actions</Th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredProjects.map((project) => (
                  <tr key={project.id} className="portal-row">
                    <Td className="font-medium text-ink">
                      <Link
                        className="text-brand-700 hover:underline"
                        href={`/delivery?projectId=${project.id}`}
                      >
                        {project.name}
                      </Link>
                    </Td>
                    <Td>{clientById.get(project.clientId)?.name ?? 'Not available'}</Td>
                    <Td>
                      <Badge value={project.status} />
                    </Td>
                    <Td className="min-w-48 max-w-sm whitespace-pre-wrap break-words text-xs">
                      {project.description ?? 'No description'}
                    </Td>
                    <Td>{formatDate(project.createdAt)}</Td>
                    {canManage ? (
                      <Td>
                        <Button
                          onClick={() => startEdit(project)}
                          disabled={saving}
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
          ) : !projectsState.loading && projectsState.data ? (
            <div className="p-5">
              <EmptyState
                description={
                  canManage
                    ? 'Adjust filters or create a project.'
                    : 'No projects match your current filters.'
                }
                title="No projects found"
                action={
                  statusFilter !== 'ALL' || clientFilter !== 'ALL' ? (
                    <Button
                      variant="secondary"
                      onClick={() => {
                        setStatusFilter('ALL');
                        setClientFilter('ALL');
                        const next = new URL(window.location.href);
                        if (next.searchParams.has('clientId')) {
                          next.searchParams.delete('clientId');
                          window.history.pushState(null, '', next);
                        }
                      }}
                    >
                      Reset filters
                    </Button>
                  ) : undefined
                }
              />
            </div>
          ) : null}
        </section>

        {canManage ? (
          <section className="portal-support min-w-0" aria-labelledby="project-form-title">
            <p className="portal-kicker">
              {editing
                ? (clientById.get(editing.clientId)?.name ?? 'Project ownership')
                : 'Project ownership'}
            </p>
            <h2 id="project-form-title" className="portal-section-title">
              {editing ? 'Edit project' : 'Create project'}
            </h2>
            <form
              id="project-form"
              className="portal-form mt-4 scroll-mt-24 space-y-4"
              onSubmit={handleSubmit}
            >
              <fieldset disabled={saving} className="min-w-0 space-y-4">
                {!editing ? (
                  <div>
                    <FieldLabel htmlFor="projects-client">Client</FieldLabel>
                    <Select
                      id="projects-client"
                      disabled={clientsState.loading || !!clientsState.error}
                      onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                      required
                      value={form.clientId}
                    >
                      <option value="">Select client</option>
                      {(clientsState.data ?? []).map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </Select>
                    {clientsState.loading ? (
                      <p role="status" className="mt-2 text-sm text-muted">
                        Loading clients...
                      </p>
                    ) : !clientsState.error && !clientsState.data?.length ? (
                      <p className="mt-2 text-sm text-muted">
                        No clients yet.{' '}
                        <Link href="/clients" className="text-brand-700 underline">
                          Create client
                        </Link>
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div>
                  <FieldLabel htmlFor="projects-name">Name</FieldLabel>
                  <Input
                    id="projects-name"
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                    required
                    value={form.name}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="projects-status">Status</FieldLabel>
                  <Select
                    id="projects-status"
                    onChange={(event) =>
                      setForm({ ...form, status: event.target.value as ProjectStatus })
                    }
                    value={form.status}
                  >
                    {projectStatuses.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="projects-description">Description</FieldLabel>
                  <Textarea
                    id="projects-description"
                    onChange={(event) => setForm({ ...form, description: event.target.value })}
                    value={form.description}
                  />
                </div>
                {formError ? (
                  <p role="alert" className="break-words text-sm text-red-700">
                    {formError}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button
                    disabled={
                      saving ||
                      (!editing && (clientsState.loading || !!clientsState.error || !form.clientId))
                    }
                    type="submit"
                  >
                    {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    {editing ? 'Save changes' : 'Create project'}
                  </Button>
                  {editing ? (
                    <Button
                      onClick={() => {
                        setEditing(null);
                        setForm({ ...emptyProjectForm, clientId: selectedClient });
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

export default function ProjectsPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Projects />
    </Suspense>
  );
}
