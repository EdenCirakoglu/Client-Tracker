'use client';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Circle } from 'lucide-react';
import { api } from '../../lib/api';
import { useApiData } from '../../lib/use-api-data';
import { titleCase } from '../../lib/format';
import { FieldLabel, Select } from '../ui/input';
import { ErrorState, LoadingState } from '../ui/states';

export function ClientSetup() {
  const router = useRouter();
  const params = useSearchParams();
  const clients = useApiData(api.clients, []);
  const selected = params.get('clientId') ?? '';
  const state = useApiData(
    () => (selected ? api.clientOnboarding(selected) : Promise.resolve(null)),
    [selected],
  );
  const data = state.data?.client.id === selected ? state.data : null;
  const invitationLabels: Record<string, string> = {
    PENDING: 'Invitation queued; the mail worker acts next.',
    SENDING: 'Sending invitation; access is not activated yet.',
    DELIVERED: 'Mail server accepted the invitation. This does not confirm inbox delivery.',
    FAILED: 'Invitation delivery failed. Review Email delivery in Accounts.',
    EXPIRED: 'Invitation expired or was suppressed. Review the contact in Accounts.',
  };
  const accounts = `/users?clientId=${selected}#invite-account`;
  const steps = data
    ? [
        {
          title: 'Client details',
          complete: true,
          detail: data.client.name,
          href: '/clients',
          action: 'Review client',
        },
        {
          title: 'A project for this client',
          complete: !!data.project,
          detail:
            data.project?.name ?? 'Administrator: create the project before inviting requests.',
          href: `/projects?clientId=${selected}#project-form`,
          action: data.project ? 'Review projects' : 'Create project',
        },
        {
          title: 'Invite a named contact',
          complete: !!data.invitation || !!data.reviewer,
          detail: data.invitation
            ? `${data.invitation.name}: ${invitationLabels[data.invitation.status] ?? 'Check invitation status in Accounts.'}`
            : data.reviewer
              ? 'An active contact exists. No invitation delivery record is retained.'
              : 'Administrator: invite a client contact for this organisation.',
          href: accounts,
          action:
            data.invitation || data.reviewer
              ? 'Review invitation and delivery'
              : 'Invite client contact',
        },
        {
          title: 'An active, eligible reviewer',
          complete: !!data.reviewer,
          detail: data.reviewer
            ? `${data.reviewer.name} can be selected as reviewer. Each proposal still needs a named reviewer.`
            : 'The invited contact must set their own password. An invitation alone does not activate access.',
          href: accounts,
          action: 'Check contact access',
        },
        {
          title: 'First request',
          complete: !!data.request,
          detail:
            data.request?.title ??
            'The client submits a request, or staff record it on their behalf using their own account.',
          href: data.request
            ? `/tickets/${data.request.id}`
            : data.project
              ? `/tickets/new?projectId=${data.project.id}`
              : `/projects?clientId=${selected}#project-form`,
          action: data.request
            ? 'Open first request'
            : data.project
              ? 'Record request as staff'
              : 'Create project first',
        },
        {
          title: 'First client decision',
          complete: !!data.decision,
          detail: data.decision
            ? `${data.decision.actor ?? 'Client'}: ${titleCase(data.decision.action)} on ${data.decision.title}. This records a decision, not necessarily acceptance.`
            : 'Staff propose scope or an outcome on a request. Only its designated, active client reviewer can decide.',
          href: data.decision
            ? `/tickets/${data.decision.ticketId}#${data.decision.section}`
            : data.request
              ? `/tickets/${data.request.id}#delivery`
              : data.project
                ? `/tickets/new?projectId=${data.project.id}`
                : `/projects?clientId=${selected}#project-form`,
          action: data.decision
            ? 'Read decision'
            : data.request
              ? 'Propose an outcome'
              : 'Record a request first',
        },
      ]
    : [];
  const nextStep = steps.findIndex((step) => !step.complete);
  const next = steps[nextStep];
  return (
    <section aria-labelledby="client-setup-title" className="portal-section space-y-4">
      <p className="portal-kicker">Client onboarding</p>
      <h2 id="client-setup-title" className="portal-section-title">
        Set up one client
      </h2>
      <p className="text-sm text-muted">
        Every step below belongs to the selected client. Keep your own administrator account
        throughout.
      </p>
      {clients.loading ? (
        <LoadingState label="Loading clients..." />
      ) : clients.error ? (
        <ErrorState message={clients.error} onRetry={clients.reload} />
      ) : (
        <>
          <div className="max-w-lg">
            <FieldLabel htmlFor="setup-client">Client to set up</FieldLabel>
            <Select
              id="setup-client"
              value={selected}
              onChange={(event) =>
                router.push(event.target.value ? `/guide?clientId=${event.target.value}` : '/guide')
              }
            >
              <option value="">Choose client</option>
              {(clients.data ?? []).map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Select>
          </div>
          {!clients.data?.length ? (
            <p className="text-sm">
              No clients yet.{' '}
              <Link className="font-semibold text-brand-700 underline" href="/clients">
                Create your first client
              </Link>
              .
            </p>
          ) : !selected ? (
            <p className="text-sm text-muted">
              Choose a client to see their next step, or{' '}
              <Link className="text-brand-700 underline" href="/clients">
                add a client
              </Link>
              .
            </p>
          ) : null}
        </>
      )}
      {selected && state.loading ? (
        <LoadingState label="Checking this client..." />
      ) : selected && state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : data ? (
        <>
          <p role="status" className="text-sm text-muted">
            {steps.filter((step) => step.complete).length} of {steps.length} steps recorded for{' '}
            {data.client.name}.
          </p>
          {next ? (
            <a
              href={`#setup-step-${nextStep}`}
              className="inline-flex min-h-11 items-center border-l-2 border-brand-600 pl-3 text-sm font-semibold text-brand-700"
            >
              Next: {next.title}
            </a>
          ) : (
            <p className="text-sm text-brand-700">All six setup steps have a recorded result.</p>
          )}
          <ol className="divide-y divide-border">
            {steps.map((step, index) => (
              <li
                id={`setup-step-${index}`}
                key={step.title}
                className="portal-row flex scroll-mt-24 items-start gap-3 py-4"
              >
                {step.complete ? (
                  <CheckCircle2
                    aria-label="Recorded"
                    className="mt-1 h-5 w-5 shrink-0 text-brand-700"
                  />
                ) : (
                  <Circle
                    aria-label="Not yet recorded"
                    className="mt-1 h-5 w-5 shrink-0 text-muted"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 break-words text-sm leading-6 text-muted">{step.detail}</p>
                  <Link
                    className="mt-1 inline-flex min-h-11 items-center text-sm font-semibold text-brand-700 underline"
                    href={step.href}
                  >
                    {step.action}
                  </Link>
                </div>
              </li>
            ))}
          </ol>
        </>
      ) : null}
    </section>
  );
}
