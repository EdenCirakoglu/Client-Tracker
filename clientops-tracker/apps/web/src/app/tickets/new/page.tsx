'use client';

import Link from 'next/link';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '../../../lib/auth';
import { Send } from 'lucide-react';

import { ProtectedPage } from '../../../components/app-shell';
import { PageHeader } from '../../../components/page-header';
import { titleCase } from '../../../lib/format';
import { Button } from '../../../components/ui/button';
import { FieldLabel, Input, Select, Textarea } from '../../../components/ui/input';
import { ErrorState, LoadingState } from '../../../components/ui/states';
import { api } from '../../../lib/api';
import { ticketCategories, ticketPriorities } from '../../../lib/options';
import type { TicketCategory, TicketPriority } from '../../../lib/types';
import { useApiData } from '../../../lib/use-api-data';

function NewTicket() {
  const router = useRouter();
  const selectedProject = useSearchParams().get('projectId') ?? '';
  const { user } = useAuth();
  const projectsState = useApiData(() => api.projects(), []);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('SUPPORT');
  const [priority, setPriority] = useState<TicketPriority>('MEDIUM');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);

  const projects = useMemo(() => projectsState.data ?? [], [projectsState.data]);
  useEffect(() => {
    if (projects.some((project) => project.id === selectedProject)) setProjectId(selectedProject);
  }, [projects, selectedProject]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
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
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <ProtectedPage>
      <PageHeader
        description="Tell us what happened and which project needs attention."
        title="Create ticket"
      />
      {!projectsState.loading && !projectsState.error && projects.length === 0 ? (
        <section
          className="mb-5 max-w-3xl border-l-2 border-brand-600 pl-4"
          aria-label="Project needed"
        >
          <h2 className="text-base font-semibold">
            A project is needed before you can submit a request
          </h2>
          <p className="mt-2 text-sm text-muted">
            {user?.role === 'ADMIN'
              ? 'Create a project for the right client first, then return to this request.'
              : 'Your agency administrator needs to create a project for your organisation. You cannot submit this form yet.'}
          </p>
          <Link
            className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline"
            href={user?.role === 'ADMIN' ? '/projects#project-form' : '/guide'}
          >
            {user?.role === 'ADMIN' ? 'Create project' : 'Read the request guide'}
          </Link>
        </section>
      ) : null}

      <section className="portal-section max-w-3xl" aria-labelledby="ticket-details-title">
        <h2 id="ticket-details-title" className="portal-section-title mb-4">
          Ticket details
        </h2>
        <form className="portal-form space-y-6" onSubmit={handleSubmit}>
          {projectsState.loading ? <LoadingState label="Loading projects..." /> : null}
          {projectsState.error ? (
            <ErrorState message={projectsState.error} onRetry={projectsState.reload} />
          ) : null}
          <fieldset disabled={saving} className="min-w-0 space-y-4">
            <legend className="mb-3">Project and request</legend>
            <div>
              <FieldLabel htmlFor="new-project">Project</FieldLabel>
              <Select
                id="new-project"
                disabled={projectsState.loading || !!projectsState.error || projects.length === 0}
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
                rows={6}
                onChange={(event) => setDescription(event.target.value)}
                required
                value={description}
              />
            </div>
          </fieldset>
          <fieldset disabled={saving} className="min-w-0 border-t border-border pt-4">
            <legend className="pr-3">Classification</legend>
            <div className="grid gap-4 sm:grid-cols-2">
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
          </fieldset>
          {error ? (
            <p role="alert" className="break-words text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <Button
              disabled={
                saving || projectsState.loading || !!projectsState.error || projects.length === 0
              }
              type="submit"
            >
              <Send className="h-4 w-4" />
              {saving ? 'Creating ticket...' : 'Create ticket'}
            </Button>
            <Link
              href="/tickets"
              className="inline-flex min-h-11 items-center text-sm text-brand-700"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </ProtectedPage>
  );
}

export default function NewTicketPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <NewTicket />
    </Suspense>
  );
}
