'use client';
import { useState } from 'react';
import { api } from '../lib/api';
import { useApiData } from '../lib/use-api-data';
import { ErrorState, LoadingState } from './ui/states';

export function NotificationPreferences() {
  const state = useApiData(api.notificationPreferences, []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [selection, setSelection] = useState<boolean | null>(null);
  async function save(enabled: boolean) {
    const previous = selection ?? state.data?.workflowNotifications ?? true;
    setSelection(enabled);
    setBusy(true);
    setError('');
    setMessage('');
    try {
      await api.updateNotificationPreferences(enabled);
      state.reload();
      setMessage(
        enabled
          ? 'Workflow emails enabled.'
          : 'Workflow emails turned off. Decisions remain available in the portal.',
      );
    } catch (caught) {
      setSelection(previous);
      setError(caught instanceof Error ? caught.message : 'Preference could not be saved.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="notification-preferences-heading"
      className="mt-8 max-w-xl space-y-3 border-t border-border pt-6"
    >
      <h2 id="notification-preferences-heading" className="text-lg font-semibold">
        Workflow emails
      </h2>
      <p id="notification-preferences-help" className="text-sm text-muted">
        Review requests, recorded decisions and selected progress updates. Invitations and password
        recovery are always sent separately.
      </p>
      {state.loading ? (
        <LoadingState label="Loading email preference..." />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            className="h-4 min-h-0 w-4 shrink-0"
            checked={selection ?? state.data.workflowNotifications}
            disabled={busy}
            aria-describedby="notification-preferences-help"
            onChange={(event) => void save(event.target.checked)}
          />
          Receive workflow emails
        </label>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <p role="status" className="text-sm text-brand-700">
        {busy ? 'Saving preference...' : message}
      </p>
    </section>
  );
}
