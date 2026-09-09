'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';

import { ProtectedPage } from '../../../components/app-shell';
import { PageHeader } from '../../../components/page-header';
import { titleCase } from '../../../lib/format';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader } from '../../../components/ui/card';
import { FieldLabel, Input, Select, Textarea } from '../../../components/ui/input';
import { ErrorState, LoadingState } from '../../../components/ui/states';
import { api } from '../../../lib/api';
import { ticketCategories, ticketPriorities } from '../../../lib/options';
import type { TicketCategory, TicketPriority } from '../../../lib/types';
import { useApiData } from '../../../lib/use-api-data';

export default function NewTicketPage() {
  const router = useRouter();
  const projectsState = useApiData(() => api.projects(), []);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('SUPPORT');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const projects = useMemo(() => projectsState.data ?? [], [projectsState.data]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const ticket = await api.createTicket({
        projectId,
        title,
        description,
        category,
        priority,
      });

      router.replace(`/tickets/${ticket.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ticket could not be created.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedPage>
      <PageHeader
        description="Tell us what happened and which project needs attention."
        title="Create ticket"
      />

      <div className="max-w-3xl">
        <Card>
          <CardHeader title="Ticket details" />
          <form className="space-y-4 p-5" onSubmit={handleSubmit}>
            {projectsState.loading ? <LoadingState label="Loading projects..." /> : null}
            {projectsState.error ? (
              <ErrorState message={projectsState.error} onRetry={projectsState.reload} />
            ) : null}
            <div>
              <FieldLabel htmlFor="new-project">Project</FieldLabel>
              <Select
                id="new-project"
                onChange={(event) => setProjectId(event.target.value)}
                required
                value={projectId}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <FieldLabel htmlFor="new-title">Title</FieldLabel>
              <Input
                id="new-title"
                onChange={(event) => setTitle(event.target.value)}
                required
                value={title}
              />
            </div>
            <div>
              <FieldLabel htmlFor="new-description">Description</FieldLabel>
              <Textarea
                id="new-description"
                onChange={(event) => setDescription(event.target.value)}
                required
                value={description}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <FieldLabel htmlFor="new-category">Category</FieldLabel>
                <Select
                  id="new-category"
                  onChange={(event) => setCategory(event.target.value as TicketCategory)}
                  value={category}
                >
                  {ticketCategories.map((option) => (
                    <option key={option} value={option}>
                      {titleCase(option)}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <FieldLabel htmlFor="new-priority">Priority</FieldLabel>
                <Select
                  id="new-priority"
                  onChange={(event) => setPriority(event.target.value as TicketPriority)}
                  value={priority}
                >
                  {ticketPriorities.map((option) => (
                    <option key={option} value={option}>
                      {titleCase(option)}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            {error ? (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            ) : null}
            {!projectsState.loading && !projectsState.error && projects.length === 0 ? (
              <p role="status" className="text-sm text-muted">
                No projects are available. Contact your account manager to get started.
              </p>
            ) : null}
            <Button disabled={saving || projects.length === 0} type="submit">
              <Send className="h-4 w-4" />
              {saving ? 'Creating ticket...' : 'Create ticket'}
            </Button>
          </form>
        </Card>
      </div>
    </ProtectedPage>
  );
}
