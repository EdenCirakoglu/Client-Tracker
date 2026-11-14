'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { useApiData } from '../../lib/use-api-data';
import { FieldLabel, Select } from '../ui/input';
import { ErrorState, LoadingState } from '../ui/states';

export function ClientSetupSummary({ refresh }: { refresh: number }) {
  const { user } = useAuth();
  const [preferred, setPreferred] = useState('');
  const preferenceKey = user ? `clientops.dashboard.client.${user.id}` : null;
  const clients = useApiData(api.clients, [refresh]);
  useEffect(() => {
    try {
      setPreferred(preferenceKey ? (localStorage.getItem(preferenceKey) ?? '') : '');
    } catch {
      setPreferred('');
    }
  }, [preferenceKey]);
  // A remembered ID is only a preference, never authority to load a client.
  const selected = clients.data?.find((client) => client.id === preferred) ?? clients.data?.[0];
  function selectClient(id: string) {
    setPreferred(id);
    try {
      if (preferenceKey) localStorage.setItem(preferenceKey, id);
    } catch {
      // Selection still works when browser storage is unavailable.
    }
  }
  return (
    <section className="portal-section portal-feature" aria-labelledby="setup-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="setup-heading" className="portal-section-title">
          Client setup
        </h2>
        <Link
          href="/clients"
          className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700"
        >
          Manage clients
        </Link>
      </div>
      {clients.loading ? (
        <LoadingState label="Loading clients..." />
      ) : clients.error ? (
        <ErrorState message={clients.error} onRetry={clients.reload} />
      ) : clients.data ? (
        clients.data.length ? (
          <div className="portal-setup-content">
            <div className="min-w-0">
              <FieldLabel htmlFor="dashboard-setup-client">Client to set up</FieldLabel>
              <Select
                id="dashboard-setup-client"
                value={selected?.id ?? ''}
                onChange={(event) => selectClient(event.target.value)}
              >
                {clients.data.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>
              {selected ? (
                <p className="mt-3 break-words text-xs text-muted">
                  Selected client: {selected.name}
                </p>
              ) : null}
            </div>
            {selected ? (
              <ClientNextStep key={selected.id} clientId={selected.id} refresh={refresh} />
            ) : (
              <Link
                href="/guide"
                className="mt-3 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
              >
                Open client setup guide <ArrowRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            )}
          </div>
        ) : (
          <div className="mt-3">
            <p className="text-sm text-muted">No client organisations recorded.</p>
            <Link
              href="/clients"
              className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
            >
              Create your first client <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        )
      ) : null}
    </section>
  );
}

function ClientNextStep({ clientId, refresh }: { clientId: string; refresh: number }) {
  const { data, loading, error, reload } = useApiData(
    () => api.clientOnboarding(clientId),
    [clientId, refresh],
  );
  if (loading) return <LoadingState label="Checking this client..." />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (!data) return null;
  const next = !data.project
    ? {
        label: 'Create a client project',
        href: `/projects?clientId=${clientId}#project-form`,
        detail: 'No project recorded for this client.',
      }
    : !data.reviewer
      ? {
          label: data.invitation ? 'Check contact access' : 'Invite client contact',
          href: `/users?clientId=${clientId}#invite-account`,
          detail:
            'No active, eligible reviewer recorded. An invitation alone does not activate access.',
        }
      : !data.request
        ? {
            label: 'Record first request',
            href: `/tickets/new?projectId=${data.project.id}`,
            detail: `Project: ${data.project.name}. Active reviewer: ${data.reviewer.name}.`,
          }
        : !data.decision
          ? {
              label: 'Open first request',
              href: `/tickets/${data.request.id}#delivery`,
              detail: 'No client decision recorded yet.',
            }
          : {
              label: 'Read first decision',
              href: `/tickets/${data.decision.ticketId}#${data.decision.section}`,
              detail: 'First client decision recorded. This is not necessarily acceptance.',
            };
  return (
    <div className="portal-setup-next">
      <p className="break-words text-sm text-muted">{next.detail}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1">
        <Link
          href={next.href}
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
        >
          {next.label}
          <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
        </Link>
        <Link
          href={`/guide?clientId=${clientId}`}
          className="inline-flex min-h-11 items-center text-sm text-brand-700 underline"
        >
          Full client setup
        </Link>
      </div>
    </div>
  );
}
