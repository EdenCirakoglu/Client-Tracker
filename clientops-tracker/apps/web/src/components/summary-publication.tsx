'use client';
import { useState } from 'react';
import { Send } from 'lucide-react';
import { api } from '../lib/api';
import type { ProgressSummary } from '../lib/types';
import { useApiData } from '../lib/use-api-data';
import { Button } from './ui/button';
import { ErrorState, LoadingState } from './ui/states';

interface SummaryPublicationProps {
  summary: ProgressSummary;
  onPublished: (summary: ProgressSummary) => void;
}
export function SummaryPublication({ summary, onPublished }: SummaryPublicationProps) {
  const contacts = useApiData(() => api.summaryRecipients(summary.id), [summary.id]);
  const [selected, setSelected] = useState<string[]>([]);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  async function publish() {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      onPublished(await api.publishSummary(summary.id, selected));
      setMessage(
        selected.length
          ? 'Published to the portal. Email notices queued for the selected contacts; delivery is not yet confirmed.'
          : 'Published to the client portal. No email was requested.',
      );
      setSelected([]);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Publication failed.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="summary-publication-heading"
      className="space-y-4 border-t border-border pt-5"
    >
      <h2 id="summary-publication-heading" className="text-lg font-semibold">
        {summary.publishedAt ? 'Notify client contacts' : 'Publish this update'}
      </h2>
      {!summary.publishedAt ? (
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
      ) : null}
      <fieldset disabled={busy} className="space-y-2">
        <legend className="mb-2 text-sm font-medium">Email a portal link (optional)</legend>
        {contacts.loading ? (
          <LoadingState label="Loading contacts..." />
        ) : contacts.error ? (
          <ErrorState message={contacts.error} onRetry={contacts.reload} />
        ) : contacts.data?.length ? (
          contacts.data.map((contact) => (
            <label key={contact.id} className="flex min-h-11 items-center gap-3 text-sm">
              <input
                type="checkbox"
                className="h-4 min-h-0 w-4 shrink-0"
                disabled={!contact.workflowNotifications}
                checked={selected.includes(contact.id)}
                onChange={(e) =>
                  setSelected((values) =>
                    e.target.checked
                      ? [...values, contact.id]
                      : values.filter((id) => id !== contact.id),
                  )
                }
              />
              <span>
                {contact.name}
                {!contact.workflowNotifications ? ' (workflow emails off)' : ''}
              </span>
            </label>
          ))
        ) : (
          <p className="text-sm text-muted">
            No active client contacts. An administrator can invite contacts in Accounts.
          </p>
        )}
      </fieldset>
      <Button
        onClick={publish}
        disabled={
          busy ||
          (!summary.publishedAt && !reviewed) ||
          (!!summary.publishedAt && selected.length === 0)
        }
      >
        <Send className="h-4 w-4" />
        {busy
          ? 'Saving...'
          : summary.publishedAt
            ? 'Notify selected contacts'
            : selected.length
              ? 'Publish and notify contacts'
              : 'Publish to client portal'}
      </Button>
      <p className="text-xs text-muted">
        The published record is a fixed snapshot. Prepare a new summary to correct it. Each selected
        contact is notified once per summary; mail retries can produce duplicates.
      </p>
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <p role="status" aria-label="Summary update" className="text-sm text-brand-700">
        {message}
      </p>
    </section>
  );
}
