'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { Check, Download, Plus, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { DeliveryRecord, DeliveryRevision, Release } from '../../lib/types';
import { formatDate, titleCase } from '../../lib/format';
import { Button } from '../ui/button';
import { Card, CardHeader } from '../ui/card';
import { FieldLabel, Input, Select, Textarea } from '../ui/input';
import { ErrorState, LoadingState } from '../ui/states';

interface DeliveryRecordProps {
  ticketId: string;
  projectId: string;
}
const stateLabels: Record<DeliveryRevision['state'], string> = {
  PROPOSED: 'Outcome awaiting agreement',
  AGREED: 'Outcome agreed',
  AWAITING_ACCEPTANCE: 'Delivered - awaiting your confirmation',
  ACCEPTED: 'Accepted by client',
  CHANGES_REQUESTED: 'Changes requested',
};

export function TicketDeliveryRecord({ ticketId, projectId }: DeliveryRecordProps) {
  const { user } = useAuth();
  const internal = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';
  const [record, setRecord] = useState<DeliveryRecord | null>(null);
  const [reviewers, setReviewers] = useState<{ id: string; name: string }[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editing, setEditing] = useState(false);
  const [outcome, setOutcome] = useState('');
  const [reviewerId, setReviewerId] = useState('');
  const [owners, setOwners] = useState<{ id: string; name: string }[]>([]);
  const [ownerId, setOwnerId] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [releaseId, setReleaseId] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [feedback, setFeedback] = useState('');
  const [requestChanges, setRequestChanges] = useState(false);
  const current = record?.revisions[0];
  const canDecide =
    user?.role === 'CLIENT' &&
    current?.reviewerId === user.id &&
    (current.state === 'PROPOSED' || current.state === 'AWAITING_ACCEPTANCE');

  async function load() {
    setLoading(true);
    setLoadError('');
    try {
      const [data, people, versions, staff] = await Promise.all([
        api.delivery(ticketId),
        internal ? api.deliveryReviewers(ticketId) : Promise.resolve([]),
        internal ? api.releases() : Promise.resolve([]),
        internal ? api.deliveryOwners(ticketId) : Promise.resolve([]),
      ]);
      setRecord(data);
      setReviewers(people);
      setOwners(staff);
      setReleases(versions.filter((r) => r.projectId === projectId));
    } catch (caught) {
      setLoadError(
        caught instanceof Error ? caught.message : 'Delivery record could not be loaded.',
      );
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [ticketId, user?.id]);

  async function save(action: () => Promise<DeliveryRecord>, success: string) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      setRecord(await action());
      setMessage(success);
      setEditing(false);
      setFeedback('');
      setRequestChanges(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Changes were not saved. Refresh the record and try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  function propose(event: FormEvent) {
    event.preventDefault();
    void save(
      () =>
        api.proposeOutcome(ticketId, {
          outcome,
          reviewerId,
          ownerId,
          targetDate: targetDate || null,
          expectedRevision: current?.revision ?? 0,
        }),
      'Outcome sent for client agreement.',
    );
  }
  function deliver(event: FormEvent) {
    event.preventDefault();
    if (current)
      void save(
        () => api.requestAcceptance(ticketId, current.id, { releaseId, deliveryNotes }),
        'Acceptance requested. Ticket status has not changed.',
      );
  }
  function decide(event: FormEvent) {
    event.preventDefault();
    if (current)
      void save(
        () =>
          api.decideDelivery(ticketId, current.id, {
            decision: requestChanges
              ? 'CHANGES_REQUESTED'
              : current.state === 'PROPOSED'
                ? 'AGREED'
                : 'ACCEPTED',
            feedback,
          }),
        requestChanges
          ? 'Feedback recorded. The team can propose a revised outcome.'
          : current.state === 'PROPOSED'
            ? 'Outcome agreed.'
            : 'Acceptance recorded.',
      );
  }
  async function download() {
    setBusy(true);
    setError('');
    try {
      const exported = await api.exportDelivery(ticketId);
      const url = URL.createObjectURL(
        new Blob([exported.content], { type: 'text/plain;charset=utf-8' }),
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = exported.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card id="delivery" aria-busy={loading} className="scroll-mt-24">
      <CardHeader title="Delivery and acceptance" />
      <div className="space-y-5 p-5">
        {loading ? (
          <LoadingState />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={load} />
        ) : (
          <>
            {current ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-brand-700">
                    {current.state === 'AWAITING_ACCEPTANCE' && internal
                      ? 'Delivered - awaiting client confirmation'
                      : stateLabels[current.state]}
                  </p>
                  <span className="text-xs text-muted">Revision {current.revision}</span>
                </div>
                <RevisionDetails revision={current} />
                {current.state === 'ACCEPTED' ? (
                  <p className="text-sm text-muted">
                    Acceptance is recorded separately from ticket resolution.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted">No outcome has been proposed yet.</p>
            )}
            {internal && !editing ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setOutcome(current?.outcome ?? '');
                  setReviewerId(current?.reviewerId ?? '');
                  setOwnerId(current?.ownerId ?? user?.id ?? '');
                  setTargetDate(current?.targetDate ?? '');
                  setEditing(true);
                  setError('');
                }}
              >
                <Plus className="h-4 w-4" />
                {current ? 'Propose revised outcome' : 'Propose outcome'}
              </Button>
            ) : null}
            {internal && editing ? (
              <form onSubmit={propose} className="space-y-4">
                {current ? (
                  <p className="text-sm text-muted">
                    This creates a new revision requiring client agreement. Previous decisions stay
                    in the history.
                  </p>
                ) : null}
                <div>
                  <FieldLabel htmlFor="delivery-outcome">Acceptance criteria</FieldLabel>
                  <Textarea
                    id="delivery-outcome"
                    required
                    minLength={10}
                    maxLength={6000}
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="delivery-reviewer">Client reviewer</FieldLabel>
                  <Select
                    id="delivery-reviewer"
                    required
                    value={reviewerId}
                    onChange={(e) => setReviewerId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Select reviewer</option>
                    {reviewers.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                  {!reviewers.length ? (
                    <p className="mt-2 text-sm text-muted">
                      An administrator needs to invite an active client contact first.
                    </p>
                  ) : null}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <FieldLabel htmlFor="delivery-owner">Delivery owner</FieldLabel>
                    <Select
                      id="delivery-owner"
                      required
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      disabled={busy}
                    >
                      <option value="">Select owner</option>
                      {owners.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="delivery-target">Target date (optional, UTC)</FieldLabel>
                    <Input
                      id="delivery-target"
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      disabled={busy}
                    />
                  </div>
                </div>
                <p className="text-sm text-muted">
                  The client will review the outcome, owner and target date together.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button disabled={busy || !reviewers.length} type="submit">
                    <Send className="h-4 w-4" />
                    Request outcome agreement
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
            {internal && current?.state === 'AGREED' && !editing ? (
              <form onSubmit={deliver} className="space-y-4">
                <div>
                  <FieldLabel htmlFor="delivery-release">Delivered in release</FieldLabel>
                  <Select
                    id="delivery-release"
                    required
                    value={releaseId}
                    onChange={(e) => setReleaseId(e.target.value)}
                    disabled={busy}
                  >
                    <option value="">Select release</option>
                    {releases.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.version} - {r.title}
                      </option>
                    ))}
                  </Select>
                  {!releases.length ? (
                    <p className="mt-2 text-sm text-muted">
                      An administrator needs to add a release for this project first.
                    </p>
                  ) : null}
                </div>
                <div>
                  <FieldLabel htmlFor="delivery-notes">Delivery notes for the client</FieldLabel>
                  <Textarea
                    id="delivery-notes"
                    required
                    minLength={10}
                    maxLength={6000}
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <Button type="submit" disabled={busy || !releases.length}>
                  <Send className="h-4 w-4" />
                  Request acceptance
                </Button>
              </form>
            ) : null}
            {canDecide ? (
              <form onSubmit={decide} className="space-y-4">
                <fieldset disabled={busy} className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold">Your decision</legend>
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="delivery-decision"
                      checked={!requestChanges}
                      onChange={() => setRequestChanges(false)}
                    />
                    {current?.state === 'PROPOSED'
                      ? 'Agree to this outcome'
                      : 'Accept delivered work'}
                  </label>
                  <label className="flex min-h-10 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="delivery-decision"
                      checked={requestChanges}
                      onChange={() => setRequestChanges(true)}
                    />
                    Request changes
                  </label>
                </fieldset>
                <div>
                  <FieldLabel htmlFor="delivery-feedback">
                    {requestChanges ? 'What remains unresolved?' : 'Feedback (optional)'}
                  </FieldLabel>
                  <Textarea
                    id="delivery-feedback"
                    required={requestChanges}
                    minLength={requestChanges ? 10 : undefined}
                    maxLength={4000}
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={busy}
                  />
                </div>
                <Button type="submit" disabled={busy}>
                  <Check className="h-4 w-4" />
                  {busy
                    ? 'Saving decision...'
                    : requestChanges
                      ? 'Send feedback'
                      : current?.state === 'PROPOSED'
                        ? 'Agree outcome'
                        : 'Accept delivery'}
                </Button>
              </form>
            ) : null}
            {!internal &&
            current &&
            !canDecide &&
            ['PROPOSED', 'AWAITING_ACCEPTANCE'].includes(current.state) ? (
              <p className="text-sm text-muted">Awaiting a decision from {current.reviewerName}.</p>
            ) : null}
            <details>
              <summary className="cursor-pointer text-sm font-semibold">
                Request and previous revisions
              </summary>
              <div className="mt-4 space-y-4 text-sm">
                <p className="font-semibold">{record?.title}</p>
                <p className="whitespace-pre-wrap">{record?.originalRequest}</p>
                {record?.revisions.slice(1).map((revision) => (
                  <section className="border-t border-border pt-4" key={revision.id}>
                    <h3 className="mb-3 font-semibold">
                      Revision {revision.revision} (historical): {stateLabels[revision.state]}
                    </h3>
                    <RevisionDetails revision={revision} />
                  </section>
                ))}
              </div>
            </details>
            <Button type="button" variant="secondary" onClick={download} disabled={busy}>
              <Download className="h-4 w-4" />
              Export client delivery record
            </Button>
          </>
        )}
        <p role="status" aria-label="Delivery update" className="text-sm text-brand-700">
          {busy ? 'Saving...' : message}
        </p>
        {error ? <ErrorState message={error} onRetry={load} /> : null}
      </div>
    </Card>
  );
}

function RevisionDetails({ revision }: { revision: DeliveryRevision }) {
  return (
    <div className="space-y-3 text-sm">
      <p className="whitespace-pre-wrap">{revision.outcome}</p>
      <p className="text-muted">Client reviewer: {revision.reviewerName}</p>
      <p className="text-muted">Delivery owner: {revision.ownerName ?? 'Not recorded'}</p>
      <p className="text-muted">
        {revision.state === 'PROPOSED' ? 'Proposed target' : 'Revision target'} (UTC):{' '}
        {revision.targetDate ?? 'No target date'}
      </p>
      {revision.releaseVersion ? (
        <p className="font-medium">Release {revision.releaseVersion}</p>
      ) : null}
      {revision.deliveryNotes ? (
        <p className="whitespace-pre-wrap">{revision.deliveryNotes}</p>
      ) : null}
      <ol className="space-y-2 border-l-2 border-border pl-4">
        {revision.events.map((event) => (
          <li key={event.id}>
            <p>
              <span className="font-medium">{titleCase(event.action)}</span> by {event.actorName}{' '}
              <span className="text-xs text-muted">{formatDate(event.createdAt)}</span>
            </p>
            {event.feedback ? <p className="mt-1 whitespace-pre-wrap">{event.feedback}</p> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}
