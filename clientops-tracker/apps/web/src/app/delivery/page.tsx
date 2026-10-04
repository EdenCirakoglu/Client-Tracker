'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { DeliveryPlanList, deliveryViewLabels } from '../../components/delivery/plan-list';
import { FieldLabel, Select } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApiData } from '../../lib/use-api-data';
import type { DeliveryView } from '../../lib/types';

export default function DeliveryPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading delivery plan..." />}>
      <DeliveryPlanPage />
    </Suspense>
  );
}
function DeliveryPlanPage() {
  const params = useSearchParams();
  const { user } = useAuth();
  const query = params.toString();
  const view = params.get('view') ?? 'followup';
  const projectId = params.get('projectId') ?? '';
  const { data, error, loading, reload } = useApiData(() => api.deliveryPlan(query), [query]);
  const projects = useApiData(() => api.projects(), []);
  function setFilter(key: string, value: string) {
    const next = new URLSearchParams(window.location.search);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    window.history.pushState(null, '', `/delivery?${next}`);
  }
  return (
    <ProtectedPage>
      <PageHeader
        title="Delivery plan"
        description="Agreed outcomes, delivery targets and client decisions."
        action={
          <Button variant="secondary" disabled={loading} onClick={reload}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        }
      />
      <div className="mb-5 flex flex-wrap items-end gap-4">
        <div className="w-full sm:w-72">
          <FieldLabel htmlFor="delivery-view">Show</FieldLabel>
          <Select
            id="delivery-view"
            value={view}
            onChange={(e) => setFilter('view', e.target.value)}
          >
            {(Object.entries(deliveryViewLabels) as [DeliveryView, string][]).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
        </div>
        <div className="w-full sm:w-72">
          <FieldLabel htmlFor="delivery-project">Project</FieldLabel>
          <Select
            id="delivery-project"
            disabled={projects.loading || !!projects.error}
            value={projectId}
            onChange={(e) => setFilter('projectId', e.target.value)}
          >
            <option value="">All permitted projects</option>
            {projects.data?.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <Link
          href="/delivery"
          className="inline-flex min-h-10 items-center text-sm font-semibold text-brand-700"
        >
          Reset filters
        </Link>
      </div>
      {projects.error ? <ErrorState message={projects.error} onRetry={projects.reload} /> : null}
      <p className="mb-3 text-xs text-muted">
        {user?.role === 'CLIENT' ? 'Your organisation' : 'All client organisations'}
        {projectId
          ? ` / ${projects.data?.find((p) => p.id === projectId)?.name ?? 'Selected project'}`
          : ''}
      </p>
      {error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : loading ? (
        <LoadingState label="Loading delivery plan..." />
      ) : data ? (
        <>
          <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-3">
            <h2 className="text-base font-semibold">
              {deliveryViewLabels[view as DeliveryView]}{' '}
              <span className="tabular-nums">({data.total})</span>
            </h2>
            <p className="text-xs text-muted">As of {data.today} (UTC)</p>
          </div>
          {data.items.length ? (
            <DeliveryPlanList items={data.items} />
          ) : (
            <div className="py-8">
              <h3 className="font-semibold">No matching delivery records</h3>
              <p className="mt-2 text-sm text-muted">
                Choose another view or project. Delivery records begin with an outcome proposed on a
                ticket.
              </p>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-border pt-4">
            <Button
              variant="secondary"
              disabled={data.page === 1}
              onClick={() => setFilter('page', String(data.page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm tabular-nums">
              Page {data.page} of {Math.max(1, Math.ceil(data.total / data.limit))}
            </span>
            <Button
              variant="secondary"
              disabled={data.page * data.limit >= data.total}
              onClick={() => setFilter('page', String(data.page + 1))}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <p className="mt-5 text-xs leading-5 text-muted">
            Past target includes only agreed work not yet recorded as delivered. Upcoming covers{' '}
            {data.today} up to {data.through} (exclusive, UTC). Delivery and acceptance remain
            separate from ticket resolution.
          </p>
        </>
      ) : null}
    </ProtectedPage>
  );
}
