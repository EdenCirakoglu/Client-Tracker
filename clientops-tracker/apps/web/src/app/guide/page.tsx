'use client';
import Link from 'next/link';
import { Suspense } from 'react';
import { ProtectedPage } from '../../components/app-shell';
import { PageHeader } from '../../components/page-header';
import { ClientSetup } from '../../components/guidance/client-setup';
import { LoadingState } from '../../components/ui/states';
import { useAuth } from '../../lib/auth';

export default function GuidePage() {
  const { user } = useAuth();
  const client = user?.role === 'CLIENT';
  const admin = user?.role === 'ADMIN';
  return (
    <ProtectedPage>
      <PageHeader title="Start here" description="Your next action, and how to know it worked." />
      <div className="portal-briefing space-y-8">
        {admin ? (
          <Suspense fallback={<LoadingState />}>
            <ClientSetup />
          </Suspense>
        ) : (
          <section className="portal-section">
            <p className="portal-kicker">{client ? 'Client workflow' : 'Delivery workflow'}</p>
            <h2 className="portal-section-title">
              {client ? 'Make a request and review delivery' : 'Deliver a change for review'}
            </h2>
            <ol className="mt-4 list-decimal divide-y divide-border pl-5 text-sm leading-6 [&>li]:py-3 [&>li]:pl-2">
              {client ? (
                <>
                  <li>
                    <h3 className="mb-1 font-semibold">Record the request</h3>
                    <Link href="/tickets/new" className="text-brand-700 underline">
                      Create ticket
                    </Link>
                    : choose your project, describe the request and submit it. Your saved ticket
                    opens next. If no project exists, ask your agency contact to set it up.
                  </li>
                  <li>
                    <h3 className="mb-1 font-semibold">Review the agreement</h3>
                    Open{' '}
                    <Link href="/delivery?view=mine" className="text-brand-700 underline">
                      My decisions
                    </Link>
                    . Review the current revision, scope and acceptance criteria. Only the named
                    reviewer can decide; other contacts can read the record.
                  </li>
                  <li>
                    <h3 className="mb-1 font-semibold">Record your delivery decision</h3>
                    In Delivery and acceptance, compare the agreed outcome with Delivery evidence.
                    Choose Accept delivered work or Request changes, describe what remains
                    unresolved, then save. The recorded decision and actor stay on the ticket after
                    you sign in again.
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <h3 className="mb-1 font-semibold">Choose the request</h3>
                    Open{' '}
                    <Link
                      href={`/tickets?status=UNRESOLVED&assignedToId=${user?.id ?? ''}`}
                      className="text-brand-700 underline"
                    >
                      my assigned unresolved tickets
                    </Link>
                    . Read the original request and current scope before changing work.
                  </li>
                  <li>
                    <h3 className="mb-1 font-semibold">Agree the work</h3>
                    In Scope change, propose any additional scope for a named client approver. In
                    Delivery and acceptance, Propose outcome sets the acceptance criteria, owner and
                    optional target. Request outcome agreement; wait for the client's decision.
                  </li>
                  <li>
                    <h3 className="mb-1 font-semibold">Submit delivery evidence</h3>
                    Once agreed, choose Delivered in release from this ticket's project, add
                    Delivery notes for the client, then Request acceptance. Ask an administrator to
                    create a release if none exists. The designated client acts next.
                  </li>
                  <li>
                    <h3 className="mb-1 font-semibold">Respond to requested changes</h3>
                    After Changes requested, read the feedback and Propose revised outcome. It
                    requires fresh agreement; previous decisions remain in Request and previous
                    revisions.
                  </li>
                </>
              )}
            </ol>
            <p className="mt-4 border-l-2 border-brand-600 pl-4 text-sm leading-6">
              Ticket status, a shipped release and client acceptance are separate facts. Resolving a
              ticket or publishing a release never records acceptance.
            </p>
          </section>
        )}
        <section
          aria-labelledby="how-to-title"
          className="portal-section border-t border-border pt-6"
        >
          <h2 id="how-to-title" className="portal-section-title">
            How do I...?
          </h2>
          <div className="mt-3 divide-y divide-border text-sm leading-6">
            <details className="py-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                Find a ticket or check a delivery date
              </summary>
              <p>
                Use{' '}
                <Link className="text-brand-700 underline" href="/tickets">
                  Tickets
                </Link>{' '}
                to search or filter.{' '}
                <Link className="text-brand-700 underline" href="/delivery">
                  Delivery plan
                </Link>{' '}
                links to agreements and decisions. A proposed target is not an agreed deadline. No
                date means no recorded commitment, not overdue work.
              </p>
            </details>
            <details className="py-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                {client ? 'Read a progress summary' : 'Preview and publish a progress summary'}
              </summary>
              <p>
                <Link className="text-brand-700 underline" href="/summaries">
                  Progress summaries
                </Link>{' '}
                {client
                  ? "shows your organisation's published briefings."
                  : 'lets staff generate a draft, review it, then publish and explicitly select eligible contacts to notify. A draft is not visible to clients.'}{' '}
                Each summary is a dated snapshot; opening a linked ticket shows its current state.
                Queued mail or SMTP acceptance does not confirm inbox receipt.
              </p>
            </details>
            <details className="py-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                Export a client-safe delivery record
              </summary>
              <p>
                Open the ticket, go to Delivery and acceptance, then Export client delivery record.
                It includes the original request and delivery history, not internal comments or
                triage. Review the downloaded record before sharing it.
              </p>
              <Link
                className="inline-flex min-h-11 items-center text-brand-700 underline"
                href="/tickets"
              >
                Find a ticket to export
              </Link>
            </details>
            <details className="py-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                {client ? 'Ask a question about my request' : 'Choose the audience for a comment'}
              </summary>
              <p>
                {client
                  ? 'Add a reply on your ticket. It is visible to your organisation and the team.'
                  : 'Choose Reply to client for a public response, or Internal note for staff-only discussion. Check the audience and matching send button before posting. Delivery notes and acceptance criteria are client-visible.'}
              </p>
            </details>
            <details className="py-3">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold">
                Recover access or change email preferences
              </summary>
              <p>
                From Sign in, choose Forgot password and request a recovery link. Check your inbox
                and spam folder; a generic confirmation does not prove an account exists. If the
                link expires, request a new one. An expired invitation needs an administrator to
                resend it.
              </p>
              <p className="mt-2">
                <Link className="text-brand-700 underline" href="/account">
                  My account
                </Link>{' '}
                contains password and workflow-email preferences. Changing your password ends
                existing sessions. Account-security mail is separate from workflow preferences.
              </p>
            </details>
          </div>
        </section>
      </div>
    </ProtectedPage>
  );
}
