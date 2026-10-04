'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, Plus } from 'lucide-react';
import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { Button } from '../../components/ui/button';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, formatUtcDate } from '../../lib/format';
import { useApiData } from '../../lib/use-api-data';

export default function SummariesPage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const state = useApiData(() => api.summaries(page), [page, user?.id]);
  return (
    <ProtectedPage>
      <PageHeader title="Progress summaries" />
      {user?.role !== 'CLIENT' ? (
        <Link
          href="/summaries/new"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-white"
        >
          <Plus className="h-4 w-4" />
          Prepare summary
        </Link>
      ) : null}
      {state.loading ? (
        <LoadingState />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : (
        <>
          {!state.data?.items.length ? (
            <p className="py-6 text-sm text-muted">
              {user?.role === 'CLIENT' ? 'No published updates yet.' : 'No summaries prepared yet.'}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {state.data.items.map((summary) => (
                <li key={summary.id} className="py-4">
                  <Link
                    className="font-semibold text-brand-700 underline-offset-4 hover:underline"
                    href={`/summaries/${summary.id}`}
                  >
                    {summary.clientName}: week of {formatUtcDate(summary.periodStart)}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {summary.publishedAt
                      ? `Published ${formatDate(summary.publishedAt)}`
                      : 'Draft - not visible to clients'}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5 flex items-center gap-3">
            <Button
              variant="secondary"
              aria-label="Previous summaries"
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm">Page {page}</span>
            <Button
              variant="secondary"
              aria-label="Next summaries"
              disabled={!state.data?.hasMore}
              onClick={() => setPage(page + 1)}
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}
    </ProtectedPage>
  );
}
