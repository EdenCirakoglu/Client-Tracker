'use client';

import { useMemo, useState } from 'react';
import { Plus, Save } from 'lucide-react';

import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
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

export default function ProjectsPage() {
  const { user } = useAuth();
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [clientFilter, setClientFilter] = useState('ALL');
  const [editing, setEditing] = useState<Project | null>(null);
  const [form, setForm] = useState(emptyProjectForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const projectsState = useApiData(() => api.projects(), []);
  const clientsState = useApiData(() => api.clients(), []);

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
    setSaving(true);
    setFormError(null);

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
      setForm(emptyProjectForm);
      await projectsState.reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Project could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(project: Project) {
    setEditing(project);
    setForm({
      clientId: project.clientId,
      name: project.name,
      description: project.description ?? '',
      status: project.status,
    });
  }

  return (
    <ProtectedPage>
      <PageHeader description="Delivery status and project ownership." title="Projects" />

      <div className="mb-4 grid gap-3 md:grid-cols-3">
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

      <div
        className={`grid items-start gap-6 ${canManage ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}
      >
        <Card>
          <CardHeader title="Project portfolio" />
          {projectsState.loading ? <LoadingState /> : null}
          {projectsState.error ? (
            <div className="p-5">
              <ErrorState message={projectsState.error} onRetry={projectsState.reload} />
            </div>
          ) : null}
          {projectsState.data && filteredProjects.length > 0 ? (
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
                  <tr key={project.id}>
                    <Td className="font-medium text-ink">{project.name}</Td>
                    <Td>{clientById.get(project.clientId)?.name ?? 'Not available'}</Td>
                    <Td>
                      <Badge value={project.status} />
                    </Td>
                    <Td>{project.description ?? 'No description'}</Td>
                    <Td>{formatDate(project.createdAt)}</Td>
                    {canManage ? (
                      <Td>
                        <Button
                          onClick={() => startEdit(project)}
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
          ) : projectsState.data ? (
            <div className="p-5">
              <EmptyState
                description={
                  canManage
                    ? 'Adjust filters or create a project.'
                    : 'No projects match your current filters.'
                }
                title="No projects found"
              />
            </div>
          ) : null}
        </Card>

        {canManage ? (
          <Card>
            <CardHeader
              title={editing ? 'Edit project' : 'Create project'}
              description="Project ownership and delivery status."
            />
            <form className="space-y-4 p-5" onSubmit={handleSubmit}>
              {!editing ? (
                <div>
                  <FieldLabel htmlFor="projects-client">Client</FieldLabel>
                  <Select
                    id="projects-client"
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
                <p role="alert" className="text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
              <div className="flex gap-2">
                <Button disabled={saving} type="submit">
                  {editing ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                  {editing ? 'Save changes' : 'Create project'}
                </Button>
                {editing ? (
                  <Button
                    onClick={() => {
                      setEditing(null);
                      setForm(emptyProjectForm);
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
