'use client';

import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';

import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Button } from '../../components/ui/button';
import { Card, CardHeader } from '../../components/ui/card';
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

  const projectById = useMemo(
    () => new Map((projectsState.data ?? []).map((project) => [project.id, project])),
    [projectsState.data],
  );

  const canCreate = user?.role === 'ADMIN';

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      await api.createRelease({
        projectId: form.projectId,
        version: form.version,
        title: form.title,
        notes: form.notes || null,
        releaseDate: form.releaseDate ? new Date(form.releaseDate).toISOString() : null,
      });
      setForm(emptyReleaseForm);
      await releasesState.reload();
    } catch (caught) {
      setFormError(caught instanceof Error ? caught.message : 'Release could not be created.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedPage>
      <PageHeader description="Recent delivery updates for your projects." title="Releases" />

      <div
        className={`grid items-start gap-6 ${canCreate ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}
      >
        <Card>
          <CardHeader title="Release history" />
          {releasesState.loading ? <LoadingState /> : null}
          {releasesState.error ? (
            <div className="p-5">
              <ErrorState message={releasesState.error} onRetry={releasesState.reload} />
            </div>
          ) : null}
          {releasesState.data && releasesState.data.length > 0 ? (
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
                  <tr key={release.id}>
                    <Td className="font-semibold text-ink">{release.version}</Td>
                    <Td>{release.title}</Td>
                    <Td>
                      {release.project?.name ??
                        projectById.get(release.projectId)?.name ??
                        'Not available'}
                    </Td>
                    <Td>{formatDate(release.releaseDate)}</Td>
                    <Td>{release.notes ?? 'No notes'}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : releasesState.data ? (
            <div className="p-5">
              <EmptyState
                description="No releases are visible for this account yet."
                title="No releases found"
              />
            </div>
          ) : null}
        </Card>

        {canCreate ? (
          <Card>
            <CardHeader description="Share a delivery update." title="Create release" />
            <form className="space-y-4 p-5" onSubmit={handleSubmit}>
              <div>
                <FieldLabel htmlFor="releases-project">Project</FieldLabel>
                <Select
                  id="releases-project"
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
              </div>
              <div className="grid gap-4 md:grid-cols-2">
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
                <p role="alert" className="text-sm text-red-700">
                  {formError}
                </p>
              ) : null}
              <Button disabled={saving} type="submit">
                <Plus className="h-4 w-4" />
                Create release
              </Button>
            </form>
          </Card>
        ) : null}
      </div>
    </ProtectedPage>
  );
}
