'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Send } from 'lucide-react';
import { ProtectedPage } from '../../../components/app-shell';
import { PageHeader } from '../../../components/page-header';
import { Button } from '../../../components/ui/button';
import { ErrorState, LoadingState } from '../../../components/ui/states';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatDate, formatUtcDate } from '../../../lib/format';
import type { ProgressSummary } from '../../../lib/types';

export default function SummaryPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [summary, setSummary] = useState<ProgressSummary | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewed, setReviewed] = useState(false);
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
  async function publish() {
    setBusy(true);
    setError('');
    try {
      setSummary(await api.publishSummary(id));
      setMessage('Published to the client portal. No email was sent.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Publication failed.');
    } finally {
      setBusy(false);
    }
  }
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
          {summary.sections.map((section) => (
            <section key={section.key} className="border-t border-border pt-5">
              <h2 className="mb-3 text-base font-semibold">{section.label}</h2>
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
          {!summary.publishedAt && user?.role !== 'CLIENT' ? (
            <div className="space-y-4 border-t border-border pt-5">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 h-4 min-h-0 w-4 shrink-0"
                  checked={reviewed}
                  disabled={busy}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                I have reviewed the records and confirmed all notes are suitable for this client.
              </label>
              <Button onClick={publish} disabled={busy || !reviewed}>
                <Send className="h-4 w-4" />
                {busy ? 'Publishing...' : 'Publish to client portal'}
              </Button>
              <p className="text-xs text-muted">
                The published record is a fixed snapshot. Prepare a new summary to correct it.
              </p>
            </div>
          ) : null}
          <p role="status" aria-label="Summary update" className="text-sm text-brand-700">
            {message}
          </p>
        </div>
      ) : null}
    </ProtectedPage>
  );
}
