'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Plus, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { ScopeProposal, ScopeProposalInput, TicketCategory } from '../../lib/types';
import { Button } from '../ui/button';
import { FieldLabel, Input, Select, Textarea } from '../ui/input';
import { ErrorState, LoadingState } from '../ui/states';
import { ScopeReview } from './scope-review';

interface ScopeChangeProps {
  ticketId: string;
  category: TicketCategory;
  originalRequest?: string | null;
  originalDate?: string;
  compareOnly?: boolean;
}
const empty: ScopeProposalInput = {
  expectedRevision: 0,
  approverId: '',
  scope: '',
  exclusions: '',
  estimate: '',
  deliveryImplications: '',
  externalReference: '',
};
export function ScopeChange({
  ticketId,
  category,
  originalRequest,
  originalDate,
  compareOnly = false,
}: ScopeChangeProps) {
  const { user } = useAuth();
  const internal = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
  const [proposals, setProposals] = useState<ScopeProposal[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ScopeProposalInput>(empty);
  const current = proposals[0];
  async function load() {
    setLoading(true);
    setError('');
    try {
      const [data, reviewers] = await Promise.all([
        api.scopeProposals(ticketId),
        internal ? api.deliveryReviewers(ticketId) : Promise.resolve([]),
      ]);
      setProposals(data);
      setPeople(reviewers);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Scope proposals could not be loaded.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [ticketId, user?.id]);
  useEffect(() => {
    if (message) document.getElementById('scope-update')?.focus({ preventScroll: true });
  }, [message]);
  async function save(action: () => Promise<ScopeProposal[]>, success: string) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setProposals(await action());
      setEditing(false);
      setMessage(success);
      return true;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Decision could not be saved.');
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  function propose(event: FormEvent) {
    event.preventDefault();
    void save(
      () => api.proposeScope(ticketId, { ...form, expectedRevision: current?.revision ?? 0 }),
      'Proposal sent for approval.',
    );
  }
  const staffControls = (
    <div className="space-y-4">
      {' '}
      {internal && category === 'FEATURE_REQUEST' && !editing ? (
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => {
            setForm(
              current
                ? {
                    approverId: current.approverId,
                    scope: current.scope,
                    exclusions: current.exclusions,
                    estimate: current.estimate,
                    deliveryImplications: current.deliveryImplications,
                    expectedRevision: current.revision,
                    externalReference: current.externalReference ?? '',
                  }
                : empty,
            );
            setEditing(true);
          }}
        >
          <Plus className="h-4 w-4" />
          {current ? 'Revise scope proposal' : 'Propose scope change'}
        </Button>
      ) : null}
      {editing ? (
        <form onSubmit={propose} className="space-y-4">
          {current ? (
            <p className="text-sm text-muted">
              A new revision needs its own approval. Previous decisions will be retained.
            </p>
          ) : null}
          {(['scope', 'exclusions', 'deliveryImplications'] as const).map((key) => (
            <div key={key}>
              <FieldLabel htmlFor={`scope-${key}`}>
                {key === 'scope'
                  ? 'Proposed scope'
                  : key === 'exclusions'
                    ? 'Excluded work'
                    : 'Delivery implications'}
              </FieldLabel>
              <Textarea
                id={`scope-${key}`}
                value={form[key]}
                required
                minLength={key === 'exclusions' ? 1 : 10}
                maxLength={key === 'scope' ? 6000 : 4000}
                disabled={busy}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <FieldLabel htmlFor="scope-estimate">Effort estimate (not actual time)</FieldLabel>
            <Input
              id="scope-estimate"
              required
              maxLength={500}
              value={form.estimate}
              disabled={busy}
              onChange={(e) => setForm({ ...form, estimate: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="scope-reference">
              External quotation or invoice reference (optional)
            </FieldLabel>
            <Input
              id="scope-reference"
              maxLength={255}
              value={form.externalReference}
              disabled={busy}
              onChange={(e) => setForm({ ...form, externalReference: e.target.value })}
            />
          </div>
          <div>
            <FieldLabel htmlFor="scope-approver">Client approver</FieldLabel>
            <Select
              id="scope-approver"
              required
              value={form.approverId}
              disabled={busy}
              onChange={(e) => setForm({ ...form, approverId: e.target.value })}
            >
              <option value="">Select approver</option>
              {people.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy || !people.length}>
              <Send className="h-4 w-4" />
              Request scope approval
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={busy}
              onClick={() => setEditing(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
  if (!loading && !error && !current && category !== 'FEATURE_REQUEST') return null;
  return (
    <section id="scope" aria-busy={loading} aria-labelledby="scope-title" className="scroll-mt-24">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="scope-title" className="text-lg font-semibold">
          Scope change
        </h2>
        {current && !compareOnly ? (
          <a
            href="#scope-decision-panel"
            className="inline-flex min-h-11 items-center text-sm text-brand-700"
          >
            Review decision
          </a>
        ) : null}
      </div>
      {loading ? (
        <LoadingState />
      ) : current ? (
        <ScopeReview
          compareOnly={compareOnly}
          current={current}
          proposals={proposals}
          originalRequest={originalRequest}
          originalDate={originalDate}
          userId={user?.id}
          internal={internal}
          busy={busy}
          error={error}
          onReload={load}
          onDecide={(proposal, decision, feedback) =>
            save(
              () => api.decideScope(ticketId, proposal.id, { decision, feedback }),
              'Your decision is recorded for this proposal revision.',
            )
          }
        >
          {internal && !compareOnly ? staffControls : null}
        </ScopeReview>
      ) : (
        <div className="space-y-4 rounded-lg border border-border bg-panel p-5">
          <p className="text-sm text-muted">No additional scope proposed.</p>
          {!compareOnly ? staffControls : null}
        </div>
      )}
      <p
        id="scope-update"
        tabIndex={-1}
        role="status"
        aria-label="Scope update"
        className="mt-3 text-sm text-brand-700"
      >
        {busy ? 'Saving...' : message}
      </p>
      {error ? <ErrorState message={error} onRetry={load} /> : null}
    </section>
  );
}
