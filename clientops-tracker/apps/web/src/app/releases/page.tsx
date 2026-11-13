'use client';

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Button } from '../../components/ui/button';
import { FieldLabel, Input, Select, Textarea } from '../../components/ui/input';
import { EmptyState, ErrorState, LoadingState } from '../../components/ui/states';
import { DataTable, Td, Th } from '../../components/ui/table';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate } from '../../lib/format';
import { useApiData } from '../../lib/use-api-data';

const emptyReleaseForm = {
  projectId: '',
  version: '',
  title: '',
  notes: '',
  releaseDate: '',
};

export default function ReleasesPage() {
  const { user } = useAuth();
  const releasesState = useApiData(() => api.releases(), []);
  const projectsState = useApiData(() => api.projects(), []);
  const [form, setForm] = useState(emptyReleaseForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const submitting = useRef(false);

  const projectById = useMemo(
    () => new Map((projectsState.data ?? []).map((project) => [project.id, project])),
    [projectsState.data],
  );

  const canCreate = user?.role === 'ADMIN';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setSaving(true);
    setFormError(null);
    setMessage('');

    try {
      await api.createRelease({
        projectId: form.projectId,
        version: form.version,
        title: form.title,
        notes: form.notes || null,
        releaseDate: form.releaseDate ? new Date(form.releaseDate).toISOString() : null,
      });
      setForm(emptyReleaseForm);
      setMessage('Release created.');
      await releasesState.reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Release could not be created.');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  }

  return (
    <ProtectedPage>
      <PageHeader
        description="Recent delivery updates for your projects."
        title="Releases"
        action={
          canCreate ? (
            <a
              href="#release-form"
              className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
            >
              <Plus className="h-4 w-4" />
              Create release
            </a>
          ) : undefined
        }
      />
      {message ? (
        <p role="status" className="mb-4 text-sm text-brand-700">
          {message}
        </p>
      ) : null}
      {projectsState.error ? (
        <ErrorState
          message={`Project information unavailable: ${projectsState.error}`}
          onRetry={projectsState.reload}
        />
      ) : null}

      <div className={canCreate ? 'portal-workspace' : ''}>
        <section className="portal-section min-w-0" aria-labelledby="release-history-title">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="release-history-title" className="portal-section-title">
              Release history
            </h2>
            {releasesState.data && !releasesState.loading ? (
              <p className="portal-kicker">{releasesState.data.length} releases</p>
            ) : null}
          </div>
          {releasesState.loading ? <LoadingState /> : null}
          {releasesState.error ? (
            <div className="p-5">
              <ErrorState message={releasesState.error} onRetry={releasesState.reload} />
            </div>
          ) : null}
          {!releasesState.loading && releasesState.data && releasesState.data.length > 0 ? (
            <DataTable className="rounded-none border-0">
              <thead>
                <tr>
                  <Th>Version</Th>
                  <Th>Title</Th>
                  <Th>Project</Th>
                  <Th>Release date</Th>
                  <Th>Notes</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {releasesState.data.map((release) => (
                  <tr
                    key={release.id}
                    id={`release-${release.id}`}
                    className="portal-row scroll-mt-24"
                  >
                    <Td className="meridian-meta font-semibold text-ink">{release.version}</Td>
                    <Td className="min-w-48 font-semibold text-ink">{release.title}</Td>
                    <Td>
                      {release.project?.name ??
                        projectById.get(release.projectId)?.name ??
                        'Not available'}
                    </Td>
                    <Td>{formatDate(release.releaseDate)}</Td>
                    <Td className="min-w-56 max-w-lg whitespace-pre-wrap break-words text-xs">
                      {release.notes ?? 'No notes'}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : !releasesState.loading && releasesState.data ? (
            <div className="p-5">
              <EmptyState
                description="No releases are visible for this account yet."
                title="No releases found"
              />
            </div>
          ) : null}
        </section>

        {canCreate ? (
          <section className="portal-support min-w-0" aria-labelledby="release-form-title">
            <p className="portal-kicker">Delivery update</p>
            <h2 id="release-form-title" className="portal-section-title">
              Create release
            </h2>
            <form
              id="release-form"
              className="portal-form mt-4 scroll-mt-24 space-y-4"
              onSubmit={handleSubmit}
            >
              <fieldset disabled={saving} className="min-w-0 space-y-4">
                <div>
                  <FieldLabel htmlFor="releases-project">Project</FieldLabel>
                  <Select
                    id="releases-project"
                    disabled={projectsState.loading || !!projectsState.error}
                    onChange={(event) => setForm({ ...form, projectId: event.target.value })}
                    required
                    value={form.projectId}
                  >
                    <option value="">Select project</option>
                    {(projectsState.data ?? []).map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </Select>
                  {projectsState.loading ? (
                    <p role="status" className="mt-2 text-sm text-muted">
                      Loading projects...
                    </p>
                  ) : !projectsState.error && !projectsState.data?.length ? (
                    <p className="mt-2 text-sm text-muted">
                      No projects yet.{' '}
                      <Link href="/projects#project-form" className="text-brand-700 underline">
                        Create project
                      </Link>
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-4">
                  <div>
                    <FieldLabel htmlFor="releases-version">Version</FieldLabel>
                    <Input
                      id="releases-version"
                      onChange={(event) => setForm({ ...form, version: event.target.value })}
                      placeholder="1.5.0"
                      required
                      value={form.version}
                    />
                  </div>
                  <div>
                    <FieldLabel htmlFor="releases-release-date">Release date</FieldLabel>
                    <Input
                      id="releases-release-date"
                      onChange={(event) => setForm({ ...form, releaseDate: event.target.value })}
                      type="date"
                      value={form.releaseDate}
                    />
                  </div>
                </div>
                <div>
                  <FieldLabel htmlFor="releases-title">Title</FieldLabel>
                  <Input
                    id="releases-title"
                    onChange={(event) => setForm({ ...form, title: event.target.value })}
                    required
                    value={form.title}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="releases-notes">Notes</FieldLabel>
                  <Textarea
                    id="releases-notes"
                    onChange={(event) => setForm({ ...form, notes: event.target.value })}
                    value={form.notes}
                  />
                </div>
                {formError ? (
                  <p role="alert" className="break-words text-sm text-red-700">
                    {formError}
                  </p>
                ) : null}
                <Button
                  disabled={
                    saving || projectsState.loading || !!projectsState.error || !form.projectId
                  }
                  type="submit"
                >
                  <Plus className="h-4 w-4" />
                  Create release
                </Button>
              </fieldset>
            </form>
          </section>
        ) : null}
      </div>
    </ProtectedPage>
  );
}
