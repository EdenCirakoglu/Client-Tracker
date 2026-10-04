'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { Check, Plus, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import { formatDate, titleCase } from '../../lib/format';
import type { ScopeProposal, ScopeProposalInput, TicketCategory } from '../../lib/types';
import { Button } from '../ui/button';
import { Card, CardHeader } from '../ui/card';
import { FieldLabel, Input, Select, Textarea } from '../ui/input';
import { ErrorState, LoadingState } from '../ui/states';

interface ScopeChangeProps {
  ticketId: string;
  category: TicketCategory;
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
export function ScopeChange({ ticketId, category }: ScopeChangeProps) {
  const { user } = useAuth();
  const internal = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
  const [proposals, setProposals] = useState<ScopeProposal[]>([]);
  const [people, setPeople] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<ScopeProposalInput>(empty);
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED'>(
    'APPROVED',
  );
  const [feedback, setFeedback] = useState('');
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
  async function save(action: () => Promise<ScopeProposal[]>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setProposals(await action());
      setEditing(false);
      setMessage(success);
      setFeedback('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Decision could not be saved.');
    } finally {
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
  function respond(event: FormEvent) {
    event.preventDefault();
    if (current)
      void save(
        () => api.decideScope(ticketId, current.id, { decision, feedback }),
        'Your decision is recorded for this proposal revision.',
      );
  }
  if (!loading && !error && !current && category !== 'FEATURE_REQUEST') return null;
  return (
    <Card id="scope" aria-busy={loading} className="scroll-mt-24">
      <CardHeader title="Scope change" />
      <div className="space-y-4 p-5">
        {loading ? (
          <LoadingState />
        ) : (
          <>
            {current ? (
              <ProposalDetails proposal={current} />
            ) : (
              <p className="text-sm text-muted">No additional scope proposed.</p>
            )}
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
                  <FieldLabel htmlFor="scope-estimate">
                    Effort estimate (not actual time)
                  </FieldLabel>
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
            {!internal && current?.state === 'PROPOSED' && current.approverId === user?.id ? (
              <form onSubmit={respond} className="space-y-4">
                <div>
                  <FieldLabel htmlFor="scope-decision">Scope decision</FieldLabel>
                  <Select
                    id="scope-decision"
                    value={decision}
                    disabled={busy}
                    onChange={(e) => setDecision(e.target.value as typeof decision)}
                  >
                    <option value="APPROVED">Approve this revision</option>
                    <option value="REJECTED">Reject this revision</option>
                    <option value="CHANGES_REQUESTED">Request changes</option>
                  </Select>
                </div>
                <div>
                  <FieldLabel htmlFor="scope-feedback">
                    {decision === 'APPROVED'
                      ? 'Scope feedback (optional)'
                      : 'Reason for your decision'}
                  </FieldLabel>
                  <Textarea
                    id="scope-feedback"
                    value={feedback}
                    required={decision !== 'APPROVED'}
                    minLength={decision === 'APPROVED' ? undefined : 10}
                    maxLength={4000}
                    disabled={busy}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  <Check className="h-4 w-4" />
                  Record scope decision
                </Button>
              </form>
            ) : null}
            {proposals.length > 1 ? (
              <details>
                <summary className="cursor-pointer text-sm font-semibold">
                  Previous scope revisions
                </summary>
                <div className="mt-3 space-y-4">
                  {proposals.slice(1).map((proposal) => (
                    <section key={proposal.id} className="border-t border-border pt-4">
                      <ProposalDetails proposal={proposal} />
                    </section>
                  ))}
                </div>
              </details>
            ) : null}
          </>
        )}
        <p role="status" aria-label="Scope update" className="text-sm text-brand-700">
          {busy ? 'Saving...' : message}
        </p>
        {error ? <ErrorState message={error} onRetry={load} /> : null}
      </div>
    </Card>
  );
}
function ProposalDetails({ proposal }: { proposal: ScopeProposal }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="font-semibold text-brand-700">
        Revision {proposal.revision}: {titleCase(proposal.state)}
      </p>
      <dl className="space-y-3">
        {[
          ['Scope', proposal.scope],
          ['Exclusions', proposal.exclusions],
          ['Estimate (not actual time)', proposal.estimate],
          ['Delivery implications', proposal.deliveryImplications],
          ['External reference', proposal.externalReference],
        ].map(([label, value]) =>
          value ? (
            <div key={label}>
              <dt className="font-semibold">{label}</dt>
              <dd className="mt-1 whitespace-pre-wrap">{value}</dd>
            </div>
          ) : null,
        )}
      </dl>
      <p className="text-muted">
        Proposed by {proposal.proposedBy} on {formatDate(proposal.createdAt)}. Approver:{' '}
        {proposal.approverName}.
      </p>
      {proposal.decidedAt ? (
        <p className="text-muted">
          Decision recorded by {proposal.decidedBy} on {formatDate(proposal.decidedAt)}.
        </p>
      ) : null}
      {proposal.feedback ? <p className="whitespace-pre-wrap">{proposal.feedback}</p> : null}
    </div>
  );
}
