'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, Plus, Trash2 } from 'lucide-react';
import { ProtectedPage } from '../../../components/app-shell';
import { AccessDenied } from '../../../components/access-denied';
import { PageHeader } from '../../../components/page-header';
import { Button } from '../../../components/ui/button';
import { FieldLabel, Input, Select, Textarea } from '../../../components/ui/input';
import { ErrorState } from '../../../components/ui/states';
import { api } from '../../../lib/api';
import type { Client, SummaryInput, Ticket } from '../../../lib/types';
import { useAuth } from '../../../lib/auth';

export default function NewSummaryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [ticketSearch, setTicketSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState<SummaryInput>({
    clientId: '',
    weekStart: new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10),
    upcoming: [],
    blocked: [],
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [loadingTickets, setLoadingTickets] = useState(false);
  useEffect(() => {
    if (user && user.role !== 'CLIENT')
      void api
        .clients()
        .then(setClients)
        .catch((e: Error) => setError(e.message));
  }, [user?.id]);
  useEffect(() => {
    let active = true;
    if (!form.clientId || user?.role === 'CLIENT') {
      setTickets([]);
      return;
    }
    setLoadingTickets(true);
    const timer = setTimeout(() => {
      void api
        .ticketQueue(
          new URLSearchParams({
            clientId: form.clientId,
            search: ticketSearch,
            limit: '50',
          }).toString(),
        )
        .then((result) => {
          if (active) {
            setTickets(result.items);
            setTotal(result.total);
          }
        })
        .catch((e: Error) => {
          if (active) setError(e.message);
        })
        .finally(() => {
          if (active) setLoadingTickets(false);
        });
    }, 200);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [form.clientId, ticketSearch, user?.role]);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      const summary = await api.generateSummary(form);
      router.push(`/summaries/${summary.id}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Summary could not be prepared.');
      setBusy(false);
    }
  }
  if (user?.role === 'CLIENT')
    return (
      <ProtectedPage>
        <AccessDenied />
      </ProtectedPage>
    );
  return (
    <ProtectedPage>
      <Link href="/summaries" className="mb-4 inline-block text-sm text-brand-700">
        Back to summaries
      </Link>
      <PageHeader title="Prepare client summary" />
      <form onSubmit={submit} className="max-w-3xl space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <FieldLabel htmlFor="summary-client">Client organisation</FieldLabel>
            <Select
              id="summary-client"
              required
              disabled={busy}
              value={form.clientId}
              onChange={(e) => {
                setForm({ ...form, clientId: e.target.value, upcoming: [], blocked: [] });
                setTicketSearch('');
              }}
            >
              <option value="">Select client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <FieldLabel htmlFor="summary-week">Week beginning (UTC)</FieldLabel>
            <Input
              id="summary-week"
              type="date"
              required
              max={new Date().toISOString().slice(0, 10)}
              disabled={busy}
              value={form.weekStart}
              onChange={(e) => setForm({ ...form, weekStart: e.target.value })}
            />
          </div>
        </div>
        <p className="text-sm text-muted">
          Review the draft before publishing. Commitments and blocker notes below will be visible to
          this client.
        </p>
        {form.clientId ? (
          <>
            <div>
              <FieldLabel htmlFor="summary-search">
                Find a ticket for commitments or blockers
              </FieldLabel>
              <Input
                id="summary-search"
                type="search"
                maxLength={200}
                value={ticketSearch}
                onChange={(e) => setTicketSearch(e.target.value)}
              />
              <p role="status" className="mt-2 text-xs text-muted">
                {loadingTickets
                  ? 'Finding tickets...'
                  : `${Math.min(total, 50)} of ${total} matches`}
              </p>
            </div>
            {(['upcoming', 'blocked'] as const).map((key) => (
              <section key={key} className="space-y-3 border-t border-border pt-4">
                <h2 className="font-semibold">
                  {key === 'upcoming' ? 'Upcoming commitments' : 'Blocked work'}
                </h2>
                {form[key].map((note, index) => (
                  <div key={index} className="space-y-3 border-l-2 border-border pl-4">
                    <div>
                      <FieldLabel htmlFor={`${key}-ticket-${index}`}>
                        Supporting ticket {index + 1}
                      </FieldLabel>
                      <Select
                        id={`${key}-ticket-${index}`}
                        required
                        disabled={busy || loadingTickets}
                        value={note.ticketId}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [key]: form[key].map((item, i) =>
                              i === index ? { ...item, ticketId: e.target.value } : item,
                            ),
                          })
                        }
                      >
                        <option value="">Select ticket</option>
                        {note.ticketId && !tickets.some((t) => t.id === note.ticketId) ? (
                          <option value={note.ticketId}>
                            Previously selected ticket (search to change)
                          </option>
                        ) : null}
                        {tickets.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.title}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <FieldLabel htmlFor={`${key}-note-${index}`}>
                        {key === 'upcoming' ? 'Commitment and timing' : 'Recorded blocker reason'}
                      </FieldLabel>
                      <Textarea
                        id={`${key}-note-${index}`}
                        required
                        minLength={10}
                        maxLength={2000}
                        disabled={busy}
                        value={note.note}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            [key]: form[key].map((item, i) =>
                              i === index ? { ...item, note: e.target.value } : item,
                            ),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      aria-label={`Remove ${key === 'upcoming' ? 'commitment' : 'blocker'} ${index + 1}`}
                      disabled={busy}
                      onClick={() =>
                        setForm({ ...form, [key]: form[key].filter((_, i) => i !== index) })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy || form[key].length >= 20}
                  onClick={() =>
                    setForm({ ...form, [key]: [...form[key], { ticketId: '', note: '' }] })
                  }
                >
                  <Plus className="h-4 w-4" />
                  {key === 'upcoming' ? 'Add commitment' : 'Add blocker'}
                </Button>
              </section>
            ))}
          </>
        ) : null}
        {error ? <ErrorState message={error} /> : null}
        <div className="flex flex-wrap items-center gap-4">
          <Button disabled={busy || !form.clientId} type="submit">
            <Eye className="h-4 w-4" />
            {busy ? 'Preparing...' : 'Preview summary'}
          </Button>
          <Link href="/summaries" className="text-sm text-brand-700">
            Cancel
          </Link>
        </div>
      </form>
    </ProtectedPage>
  );
}
