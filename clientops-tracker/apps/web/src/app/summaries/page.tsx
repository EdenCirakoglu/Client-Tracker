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
      <PageHeader
        title="Progress summaries"
        description={
          user?.role === 'CLIENT'
            ? 'Published updates for your organisation.'
            : 'Prepared updates and published client briefings.'
        }
        action={
          user?.role !== 'CLIENT' ? (
            <Link
              href="/summaries/new"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-action px-4 text-sm font-semibold text-white"
            >
              <Plus className="h-4 w-4" />
              Prepare summary
            </Link>
          ) : undefined
        }
      />
      <section className="portal-section" aria-label="Summary archive">
        {state.loading ? (
          <LoadingState />
        ) : state.error ? (
          <ErrorState message={state.error} onRetry={state.reload} />
        ) : (
          <>
            {!state.data?.items.length ? (
              <p role="status" className="py-6 text-sm text-muted">
                {user?.role === 'CLIENT'
                  ? 'No published updates yet.'
                  : 'No summaries prepared yet.'}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {state.data.items.map((summary) => (
                  <li
                    key={summary.id}
                    className="portal-row grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                  >
                    <div className="min-w-0">
                      <Link
                        className="break-words font-semibold text-brand-700 underline-offset-4 hover:underline"
                        href={`/summaries/${summary.id}`}
                      >
                        {summary.clientName}: week of {formatUtcDate(summary.periodStart)}
                      </Link>
                      <p className="mt-1 text-xs text-muted">
                        Prepared by {summary.createdBy} on {formatDate(summary.createdAt)}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {summary.publishedAt
                        ? `Published ${formatDate(summary.publishedAt)}`
                        : 'Draft - not visible to clients'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button
                variant="secondary"
                aria-label="Previous summaries"
                title="Previous summaries"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm">Page {page}</span>
              <Button
                variant="secondary"
                aria-label="Next summaries"
                title="Next summaries"
                disabled={!state.data?.hasMore}
                onClick={() => setPage(page + 1)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </section>
    </ProtectedPage>
  );
}
