'use client';

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { ProtectedPage } from '../../../../components/app-shell';
import { ScopeChange } from '../../../../components/tickets/scope-change';
import { ErrorState, LoadingState } from '../../../../components/ui/states';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth';
import type { Ticket } from '../../../../lib/types';

export default function ComparisonPage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <Comparison />
    </Suspense>
  );
}
function Comparison() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [error, setError] = useState('');
  const back = `/tickets/${id}${search.size ? `?${search.toString()}` : ''}#scope`;
  async function load() {
    setError('');
    try {
      setTicket(await api.ticket(id));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Comparison could not be loaded.');
    }
  }
  useEffect(() => {
    if (user) void load();
  }, [id, user?.id]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (
        event.key === 'Escape' &&
        !(event.target instanceof HTMLSelectElement) &&
        !document.querySelector('dialog[open]')
      )
        router.push(back);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [back, router]);
  return (
    <ProtectedPage>
      <Link
        href={back}
        className="mb-5 inline-flex min-h-11 items-center gap-2 text-sm text-brand-700"
      >
        <ArrowLeft size={16} />
        Back to scope review
      </Link>
      <h1 className="meridian-heading mb-3 text-4xl">Compare scope revisions</h1>
      {ticket ? <p className="mb-6 text-sm text-muted">{ticket.title}</p> : null}
      {error ? (
        <ErrorState message={error} onRetry={load} />
      ) : ticket ? (
        <ScopeChange
          key={ticket.id}
          ticketId={ticket.id}
          category={ticket.category}
          originalRequest={ticket.originalDescription}
          originalDate={ticket.createdAt}
          compareOnly
        />
      ) : (
        <LoadingState />
      )}
    </ProtectedPage>
  );
}
