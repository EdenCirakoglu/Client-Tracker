'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, History, MessageSquare, ShieldCheck } from 'lucide-react';
import { comparisonSelection } from '../../lib/revision-diff';
import { formatDate, titleCase } from '../../lib/format';
import type { ScopeProposal } from '../../lib/types';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { FieldLabel, Select, Textarea } from '../ui/input';
import { ReviewDialog } from '../ui/review-dialog';
import { RevisionRiver } from './revision-river';
import { RevisionComparison } from './revision-comparison';

export type ScopeDecision = 'APPROVED' | 'REJECTED' | 'CHANGES_REQUESTED';
interface ScopeReviewProps {
  current: ScopeProposal;
  proposals: ScopeProposal[];
  originalRequest?: string | null;
  originalDate?: string;
  userId?: string;
  internal: boolean;
  busy: boolean;
  error: string;
  onDecide: (
    proposal: ScopeProposal,
    decision: ScopeDecision,
    feedback: string,
  ) => Promise<boolean>;
  onReload: () => Promise<void>;
  children?: ReactNode;
  compareOnly?: boolean;
}

export function ScopeReview({
  current,
  proposals,
  originalRequest,
  originalDate,
  userId,
  internal,
  busy,
  error,
  onDecide,
  onReload,
  children,
  compareOnly = false,
}: ScopeReviewProps) {
  const [search, setSearch] = useState('');
  const [review, setReview] = useState<{ proposal: ScopeProposal; decision: ScopeDecision } | null>(
    null,
  );
  const [confirmed, setConfirmed] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [validation, setValidation] = useState('');
  const revisions = useMemo(
    () => [...(originalRequest ? [0] : []), ...proposals.map((p) => p.revision)],
    [proposals, originalRequest],
  );
  const { from, to } = comparisonSelection(search, revisions);
  const selected = proposals.find((p) => p.revision === to);
  const previous = proposals.find((p) => p.revision === from);
  const isCurrent = to === current.revision;
  const canDecide =
    !internal && current.approverId === userId && current.state === 'PROPOSED' && isCurrent;
  useEffect(() => {
    const sync = () => setSearch(window.location.search);
    sync();
    window.addEventListener('popstate', sync);
    return () => window.removeEventListener('popstate', sync);
  }, []);
  function select(revision: number, replace = false, key = 'to') {
    const url = new URL(window.location.href);
    url.searchParams.set(key, String(revision));
    const normalized = comparisonSelection(url.search, revisions);
    url.searchParams.set('from', String(normalized.from));
    url.searchParams.set('to', String(normalized.to));
    window.history[replace ? 'replaceState' : 'pushState'](window.history.state, '', url);
    setSearch(url.search);
  }
  function open(decision: ScopeDecision) {
    setReview({ proposal: current, decision });
    setConfirmed(false);
    setFeedback('');
    setValidation('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!review || busy) return;
    if (review.decision === 'APPROVED' && !confirmed) return;
    if (review.decision !== 'APPROVED' && feedback.trim().length < 10) {
      setValidation('Describe the changes or reason in at least 10 characters.');
      return;
    }
    // Retain the reviewed ID, even if a newer proposal is created while the sheet is open.
    if (await onDecide(review.proposal, review.decision, feedback)) setReview(null);
  }
  const fields =
    selected && previous
      ? [
          { label: 'Scope', previous: previous.scope, proposed: selected.scope },
          { label: 'Exclusions', previous: previous.exclusions, proposed: selected.exclusions },
          { label: 'Estimate', previous: previous.estimate, proposed: selected.estimate },
          {
            label: 'Delivery implications',
            previous: previous.deliveryImplications,
            proposed: selected.deliveryImplications,
          },
          {
            label: 'External reference',
            previous: previous.externalReference,
            proposed: selected.externalReference,
          },
        ]
      : null;
  return (
    <>
      <div
        className={compareOnly ? 'meridian-workspace meridian-compare-only' : 'meridian-workspace'}
      >
        <div className="min-w-0 space-y-5">
          <Card>
            <RevisionRiver
              proposals={proposals}
              originalDate={originalRequest ? originalDate : undefined}
              selected={to}
              onSelect={select}
            />
            {selected && proposals.some((p) => p.revision < to) ? (
              <div className="river-comparison-picker">
                <FieldLabel htmlFor="scope-compare-from">Compare with</FieldLabel>
                <Select
                  id="scope-compare-from"
                  value={previous?.revision ?? ''}
                  onChange={(event) => select(Number(event.target.value), false, 'from')}
                >
                  {!previous ? <option value="">Choose a scope revision</option> : null}
                  {[...proposals]
                    .reverse()
                    .filter((p) => p.revision < to)
                    .map((p) => (
                      <option key={p.id} value={p.revision}>
                        Revision {p.revision} - {titleCase(p.state)}
                      </option>
                    ))}
                </Select>
                <a
                  href="#scope-history"
                  onClick={() => {
                    const details = document.getElementById('scope-history');
                    if (details instanceof HTMLDetailsElement) details.open = true;
                  }}
                  className="inline-flex min-h-11 items-center gap-2 text-sm text-brand-700"
                >
                  <History size={16} />
                  Full history
                </a>
              </div>
            ) : null}
          </Card>
          <p role="status" aria-label="Revision selection" className="sr-only">
            {to === 0
              ? 'Viewing the original request.'
              : `Viewing scope revision ${to}${previous ? `, compared with revision ${from}` : ''}. ${isCurrent ? 'Current revision.' : 'Historical revision, read only.'}`}
          </p>
          {fields ? (
            <Card>
              <RevisionComparison previousRevision={from} currentRevision={to} fields={fields} />
            </Card>
          ) : (
            <Card className="p-5">
              {selected ? (
                <ProposalDetails proposal={selected} />
              ) : (
                <>
                  <h3 className="mb-3 font-semibold">Original request</h3>
                  <p className="whitespace-pre-wrap text-sm leading-6">{originalRequest}</p>
                </>
              )}
            </Card>
          )}
          {fields && !compareOnly ? (
            <Link
              href={`/tickets/${current.ticketId}/compare?from=${from}&to=${to}`}
              className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-brand-700"
            >
              Open full comparison
              <ArrowRight size={16} />
            </Link>
          ) : null}
          {selected && fields ? (
            <details className="meridian-details">
              <summary>Read complete revision {to}</summary>
              <div className="pt-4">
                <ProposalDetails proposal={selected} />
              </div>
            </details>
          ) : null}
          {children}
        </div>
        {!compareOnly ? (
          <aside className="meridian-review-rail" aria-label="Scope decision and history">
            <Card id="scope-decision-panel" className="decision-panel scroll-mt-24">
              <p className="meridian-meta text-brand-700">
                {to === 0 ? 'Original request / recorded' : `Scope approval / revision ${to}`}
              </p>
              <h3 className="meridian-heading mt-3 text-3xl">
                {!isCurrent
                  ? 'A previous chapter.'
                  : current.state === 'APPROVED'
                    ? 'Scope approved.'
                    : current.state === 'CHANGES_REQUESTED'
                      ? 'Changes requested.'
                      : current.state === 'REJECTED'
                        ? 'Proposal declined.'
                        : canDecide
                          ? 'Your decision, next.'
                          : 'Awaiting client review.'}
              </h3>
              <p className="mt-3 text-sm leading-6 text-muted">
                {!isCurrent
                  ? 'Earlier decisions stay in the record. View the current proposal.'
                  : current.state === 'PROPOSED'
                    ? canDecide
                      ? 'Approve this scope and estimate, or explain what needs to change. Delivery acceptance is a separate step.'
                      : `Awaiting a scope decision from ${current.approverName}. Delivery acceptance is a separate step.`
                    : current.state === 'APPROVED'
                      ? 'This decision applies only to this revision. Any revised scope needs fresh approval.'
                      : 'The team acts next: review the feedback and propose a new revision. This decision will remain in the history.'}
              </p>
              <dl className="decision-facts">
                <div>
                  <dt>Designated approver</dt>
                  <dd>
                    {selected?.approverName ?? current.approverName}
                    {(selected?.approverId ?? current.approverId) === userId ? ' (you)' : ''}
                  </dd>
                </div>
                {selected ? (
                  <div>
                    <dt>Proposed by</dt>
                    <dd>{selected.proposedBy}</dd>
                  </div>
                ) : null}
                {selected ? (
                  <div>
                    <dt>Estimate, not actual time</dt>
                    <dd>{selected.estimate}</dd>
                  </div>
                ) : null}
              </dl>
              <p className="mb-4 text-sm font-semibold text-brand-700">
                {selected
                  ? `Revision ${selected.revision}: ${titleCase(selected.state)}`
                  : 'Original request: recorded'}
              </p>
              {!isCurrent ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full"
                  onClick={() => select(current.revision)}
                >
                  Review current revision {current.revision}
                  <ArrowRight size={16} />
                </Button>
              ) : canDecide ? (
                <div className="space-y-2">
                  <Button
                    type="button"
                    className="meridian-primary w-full"
                    disabled={busy}
                    onClick={() => open('APPROVED')}
                  >
                    Approve revision {current.revision}
                    <ArrowRight size={17} />
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full"
                    disabled={busy}
                    onClick={() => open('CHANGES_REQUESTED')}
                  >
                    <MessageSquare size={16} />
                    Request scope changes
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    disabled={busy}
                    onClick={() => open('REJECTED')}
                  >
                    Decline proposal
                  </Button>
                </div>
              ) : current.state === 'PROPOSED' ? (
                <p className="text-sm text-muted">
                  Only {current.approverName} can record this decision.
                </p>
              ) : null}
              {selected?.decidedAt ? (
                <div className="decision-receipt">
                  <CheckCircle2 size={18} aria-hidden="true" />
                  <p>
                    Recorded by {selected.decidedBy}
                    <br />
                    <time dateTime={selected.decidedAt}>{formatDate(selected.decidedAt)}</time>
                  </p>
                </div>
              ) : null}
              {selected?.feedback ? (
                <blockquote className="mt-4 border-l-2 border-brand-600 pl-3 text-sm leading-6">
                  {selected.feedback}
                </blockquote>
              ) : null}
              <p className="decision-trust">
                <ShieldCheck size={15} aria-hidden="true" />
                {selected?.decidedAt
                  ? 'Decision saved in the ticket history'
                  : 'Earlier decisions remain in the history'}
              </p>
            </Card>
            <Card className="p-5">
              <h3 className="mb-4 text-base font-semibold">Decision log</h3>
              <ol className="decision-log">
                {proposals.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <p className="text-sm font-medium">
                      Revision {p.revision}{' '}
                      {p.decidedAt ? titleCase(p.state).toLowerCase() : 'proposed'}
                    </p>
                    <p className="mt-1 text-xs text-muted">{p.decidedBy ?? p.proposedBy}</p>
                    <time
                      className="meridian-meta mt-1 block text-muted"
                      dateTime={p.decidedAt ?? p.createdAt}
                    >
                      {formatDate(p.decidedAt ?? p.createdAt)}
                    </time>
                  </li>
                ))}
              </ol>
            </Card>
          </aside>
        ) : null}
      </div>
      <details id="scope-history" className="meridian-details mt-5 scroll-mt-24">
        <summary>Previous scope revisions</summary>
        {proposals.length > 1 ? (
          proposals.slice(1).map((p) => (
            <section key={p.id} className="mt-4 border-t border-border pt-4">
              <ProposalDetails proposal={p} />
            </section>
          ))
        ) : (
          <p className="mt-3 text-sm text-muted">
            This is the first proposal. No earlier scope decisions exist.
          </p>
        )}
      </details>
      {review ? (
        <ReviewDialog
          title={
            review.decision === 'APPROVED'
              ? `Approve revision ${review.proposal.revision}`
              : review.decision === 'REJECTED'
                ? 'Decline this proposal'
                : 'Request scope changes'
          }
          busy={busy}
          onClose={() => setReview(null)}
        >
          <form onSubmit={submit} className="space-y-5" aria-busy={busy}>
            <dl className="space-y-4 text-sm leading-6">
              {[
                ['Scope', review.proposal.scope],
                ['Exclusions', review.proposal.exclusions],
                ['Estimate, not actual time', review.proposal.estimate],
                ['Delivery implications', review.proposal.deliveryImplications],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="font-semibold">{label}</dt>
                  <dd className="mt-1 whitespace-pre-wrap text-muted">{value}</dd>
                </div>
              ))}
            </dl>
            <p className="border-t border-border pt-4 text-sm leading-6">
              This records your decision on revision {review.proposal.revision} only. It does not
              resolve the ticket, publish a release or accept a delivery.
            </p>
            {review.decision === 'APPROVED' ? (
              <label className="flex min-h-11 items-start gap-3 text-sm leading-6">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={confirmed}
                  disabled={busy}
                  onChange={(event) => setConfirmed(event.target.checked)}
                />
                I have reviewed the changes in revision {review.proposal.revision}
              </label>
            ) : null}
            <div>
              <FieldLabel htmlFor="scope-feedback">
                {review.decision === 'APPROVED'
                  ? 'Scope feedback (optional)'
                  : 'Reason for your decision'}
              </FieldLabel>
              <Textarea
                id="scope-feedback"
                value={feedback}
                disabled={busy}
                required={review.decision !== 'APPROVED'}
                maxLength={4000}
                aria-invalid={Boolean(validation)}
                aria-describedby={validation ? 'scope-feedback-error' : undefined}
                onChange={(event) => {
                  setFeedback(event.target.value);
                  setValidation('');
                }}
              />
              {validation ? (
                <p id="scope-feedback-error" role="alert" className="mt-2 text-sm text-red-800">
                  {validation}
                </p>
              ) : null}
            </div>
            {error ? (
              <div role="alert" className="space-y-2 text-sm text-red-800">
                <p>{error}</p>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={async () => {
                    await onReload();
                    setReview(null);
                  }}
                >
                  Reload latest revision
                </Button>
              </div>
            ) : null}
            <Button
              type="submit"
              className="meridian-primary w-full"
              disabled={busy || (review.decision === 'APPROVED' && !confirmed)}
            >
              <CheckCircle2 size={17} />
              {busy ? 'Recording decision...' : 'Record scope decision'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={busy}
              onClick={() => setReview(null)}
            >
              Keep reviewing
            </Button>
          </form>
        </ReviewDialog>
      ) : null}
    </>
  );
}

export function ProposalDetails({ proposal }: { proposal: ScopeProposal }) {
  return (
    <div className="space-y-3 text-sm leading-6">
      <h4 className="font-semibold">
        Scope revision {proposal.revision} / {titleCase(proposal.state)}
      </h4>
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
              <dd className="mt-1 whitespace-pre-wrap text-muted">{value}</dd>
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
      <p className="meridian-meta break-all text-muted">Record {proposal.id}</p>
    </div>
  );
}
