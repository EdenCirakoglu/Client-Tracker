'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ProtectedPage } from '../../../components/app-shell';
import { PageHeader } from '../../../components/page-header';
import { SummaryPublication } from '../../../components/summary-publication';
import { ErrorState, LoadingState } from '../../../components/ui/states';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatDate, formatUtcDate } from '../../../lib/format';
import type { ProgressSummary } from '../../../lib/types';

const sectionTitles: Record<string, string> = {
  approvals: 'Scope decisions',
  confirmation: 'Delivery decisions',
  waiting: 'Replies needed',
  resolved: 'Resolved requests',
  accepted: 'Accepted deliveries',
  releases: 'Releases',
  upcoming: 'Upcoming commitments',
  blocked: 'Blocked work',
  'overdue-delivery': 'Past agreed target',
  'upcoming-delivery': 'Upcoming agreed targets',
};
const decisionKeys = ['approvals', 'confirmation', 'waiting'];

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState('');
  async function load() {
    setError('');
    try {
      setSummary(await api.summary(id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Summary could not be loaded.');
    }
  }
  useEffect(() => {
    if (user) void load();
  }, [id, user?.id]);
  return (
    <ProtectedPage>
      <Link href="/summaries" className="mb-4 inline-block text-sm text-brand-700">
        Back to summaries
      </Link>
      <PageHeader title={summary ? `${summary.clientName}: progress update` : 'Progress update'} />
      {error ? <ErrorState message={error} onRetry={load} /> : null}
      {!summary && !error ? <LoadingState /> : null}
      {summary ? (
        <div className="max-w-4xl space-y-6">
          <div className="space-y-2 text-sm text-muted">
            <p>
              Week: {formatUtcDate(summary.periodStart)} to{' '}
              {formatUtcDate(new Date(Date.parse(summary.periodEnd) - 1).toISOString())} (UTC).
            </p>
            <p>
              Prepared by {summary.createdBy} on {formatDate(summary.createdAt)}. Current queues are
              snapshots at preparation time.
            </p>
            <p>
              {summary.publishedAt
                ? `Published by ${summary.publishedBy} on ${formatDate(summary.publishedAt)}.`
                : 'Draft - not visible to clients.'}
            </p>
          </div>
          <section
            aria-labelledby="summary-decisions-heading"
            className="border-l-2 border-brand-600 pl-4"
          >
            <h2 id="summary-decisions-heading" className="text-lg font-semibold">
              Client decisions and replies
            </h2>
            <p className="mt-1 text-sm text-muted">
              Recorded at preparation time. Open each request to review its current state.
            </p>
          </section>
          {[...summary.sections]
            .sort((a, b) => {
              const rank = (key: string) =>
                decisionKeys.includes(key) ? decisionKeys.indexOf(key) : 3;
              return rank(a.key) - rank(b.key);
            })
            .map((section) => (
              <section key={section.key} className="border-t border-border pt-5">
                <h2 className="mb-1 break-words text-base font-semibold">
                  {sectionTitles[section.key] ?? section.label}
                </h2>
                <p className="mb-3 text-xs text-muted">{section.label}</p>
                {section.items.length ? (
                  <ul className="space-y-4">
                    {section.items.map((item, index) => (
                      <li key={`${item.href}-${index}`}>
                        <Link
                          className="text-sm font-semibold text-brand-700 underline-offset-4 hover:underline"
                          href={item.href}
                        >
                          {item.title}
                        </Link>
                        {item.detail ? (
                          <p className="mt-1 whitespace-pre-wrap text-sm">{item.detail}</p>
                        ) : null}
                        {item.recordedAt ? (
                          <p className="mt-1 text-xs text-muted">{formatDate(item.recordedAt)}</p>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted">None recorded.</p>
                )}
                {section.truncated ? (
                  <p className="mt-3 text-sm text-muted">
                    First 100 records shown. Open the linked records and lists for the full history.
                  </p>
                ) : null}
              </section>
            ))}
          {user?.role !== 'CLIENT' ? (
            <SummaryPublication summary={summary} onPublished={setSummary} />
          ) : null}
        </div>
      ) : null}
    </ProtectedPage>
  );
}
