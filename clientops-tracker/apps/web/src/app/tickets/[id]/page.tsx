'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Bot, MessageSquare, RefreshCw, WandSparkles } from 'lucide-react';

import { ProtectedPage } from '../../../components/app-shell';
import { PageHeader } from '../../../components/page-header';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Card, CardHeader } from '../../../components/ui/card';
import { FieldLabel, Select, Textarea } from '../../../components/ui/input';
import { ErrorState, LoadingState } from '../../../components/ui/states';
import { api } from '../../../lib/api';
import { useAuth } from '../../../lib/auth';
import { formatDate, titleCase } from '../../../lib/format';
import { ticketCategories, ticketPriorities, ticketStatuses } from '../../../lib/options';
import type {
  Client,
  Ticket,
  TicketCategory,
  TicketComment,
  TicketPriority,
  TicketStatus,
  TriageSuggestion,
} from '../../../lib/types';

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const ticketId = params.id;
  const { user } = useAuth();
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [comments, setComments] = useState<TicketComment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [triageSuggestion, setTriageSuggestion] = useState<TriageSuggestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentBody, setCommentBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updateMessage, setUpdateMessage] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);

  const internalUser = user?.role === 'ADMIN' || user?.role === 'DEVELOPER';

  const clientById = useMemo(
    () => new Map(clients.map((client) => [client.id, client])),
    [clients],
  );

  async function loadTicket() {
    setLoading(true);
    setError(null);
    setUpdateMessage('');
    setUpdateError(null);

    try {
      const [ticketResult, commentsResult, clientsResult] = await Promise.all([
        api.ticket(ticketId),
        api.comments(ticketId),
        api.clients(),
      ]);
      setTicket(ticketResult);
      setComments(commentsResult);
      setClients(clientsResult);

      setTriageSuggestion(ticketResult.triageSuggestion ?? null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Ticket could not be loaded.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) void loadTicket();
  }, [ticketId, user?.id]);

  async function updateTicket(body: Partial<Pick<Ticket, 'status' | 'priority' | 'category'>>) {
    setSaving(true);
    setActionError(null);
    setUpdateError(null);
    setUpdateMessage('Saving changes...');

    try {
      const updated = await api.updateTicket(ticketId, body);
      setTicket(updated);
      setTriageSuggestion(updated.triageSuggestion ?? null);
      setUpdateMessage('Changes saved.');
    } catch (caught) {
      setUpdateMessage('');
      setUpdateError(
        `Changes were not saved. ${caught instanceof Error ? caught.message : 'Please try again.'}`,
      );
    } finally {
      setSaving(false);
    }
  }

  async function addComment(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setActionError(null);

    try {
      const comment = await api.createComment(ticketId, {
        body: commentBody,
        isInternal: internalUser ? isInternal : false,
      });
      setComments((current) => [...current, comment]);
      setCommentBody('');
      setIsInternal(false);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Comment could not be added.');
    } finally {
      setSaving(false);
    }
  }

  async function generateSuggestion() {
    setSaving(true);
    setActionError(null);

    try {
      const suggestion = await api.generateTriageSuggestion(ticketId);
      setTriageSuggestion(suggestion);
    } catch (caught) {
      setActionError(caught instanceof Error ? caught.message : 'Triage suggestion failed.');
    } finally {
      setSaving(false);
    }
  }

  async function applySuggestion() {
    setSaving(true);
    setActionError(null);

    try {
      const result = await api.applyTriageSuggestion(ticketId);
      setTicket(await api.ticket(ticketId));
      setTriageSuggestion(result.triageSuggestion);
    } catch (caught) {
      setActionError(
        caught instanceof Error ? caught.message : 'Triage suggestion could not be applied.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProtectedPage>
      <Link href="/tickets" className="mb-4 inline-block text-sm font-medium text-brand-700">
        Back to tickets
      </Link>
      <PageHeader title={ticket?.title ?? 'Ticket detail'} />

      {loading ? <LoadingState /> : null}
      {error ? <ErrorState message={error} onRetry={loadTicket} /> : null}
      {actionError ? (
        <div className="mb-4">
          <ErrorState message={actionError} />
        </div>
      ) : null}

      {ticket ? (
        <div
          className={`grid items-start gap-6 ${internalUser ? 'xl:grid-cols-[minmax(0,1fr)_360px]' : ''}`}
        >
          <div className="space-y-6">
            <Card>
              <CardHeader title="Ticket information" />
              <div className="space-y-5 p-5">
                <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                  {ticket.description}
                </p>
                <div className="grid gap-4 md:grid-cols-3">
                  <Info label="Project" value={ticket.project?.name ?? 'Not available'} />
                  <Info
                    label="Client"
                    value={
                      ticket.project
                        ? (clientById.get(ticket.project.clientId)?.name ?? 'Not available')
                        : 'Not available'
                    }
                  />
                  <Info label="Assignee" value={ticket.assignee?.name ?? 'Unassigned'} />
                  <Info label="Created" value={formatDate(ticket.createdAt)} />
                  <Info label="Resolved" value={formatDate(ticket.resolvedAt)} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge value={ticket.status} />
                  <Badge value={ticket.priority} />
                  <Badge value={ticket.category} />
                </div>
              </div>
            </Card>

            {internalUser ? (
              <Card>
                <CardHeader title="Update ticket" />
                <div className="grid gap-4 p-5 md:grid-cols-3">
                  <div>
                    <FieldLabel htmlFor="ticket-status">Status</FieldLabel>
                    <Select
                      id="ticket-status"
                      disabled={saving}
                      onChange={(event) =>
                        void updateTicket({ status: event.target.value as TicketStatus })
                      }
                      value={ticket.status}
                    >
                      {ticketStatuses.map((status) => (
                        <option key={status} value={status}>
                          {titleCase(status)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="ticket-priority">Priority</FieldLabel>
                    <Select
                      id="ticket-priority"
                      disabled={saving}
                      onChange={(event) =>
                        void updateTicket({ priority: event.target.value as TicketPriority })
                      }
                      value={ticket.priority}
                    >
                      {ticketPriorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {titleCase(priority)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <FieldLabel htmlFor="ticket-category">Category</FieldLabel>
                    <Select
                      id="ticket-category"
                      disabled={saving}
                      onChange={(event) =>
                        void updateTicket({ category: event.target.value as TicketCategory })
                      }
                      value={ticket.category}
                    >
                      {ticketCategories.map((category) => (
                        <option key={category} value={category}>
                          {titleCase(category)}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="min-h-10 px-5 pb-4 text-sm">
                  <p role="status" aria-live="polite" className="text-brand-700">
                    {updateMessage}
                  </p>
                  {updateError ? (
                    <p role="alert" className="text-red-800">
                      {updateError}
                    </p>
                  ) : null}
                </div>
              </Card>
            ) : null}

            <Card>
              <CardHeader title="Comments" />
              <div className="divide-y divide-border">
                {comments.length > 0 ? (
                  comments.map((comment) => (
                    <div className="p-5" key={comment.id}>
                      <div className="flex flex-wrap items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-slate-500" />
                        <span className="text-sm font-semibold text-ink">
                          {comment.author?.name ?? 'Team member'}
                        </span>
                        {comment.isInternal ? <Badge value="INTERNAL" /> : null}
                        <span className="text-xs text-muted">{formatDate(comment.createdAt)}</span>
                      </div>
                      <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
                        {comment.body}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="p-5 text-sm text-muted">No comments yet.</p>
                )}
              </div>
              <form className="space-y-3 border-t border-border p-5" onSubmit={addComment}>
                <FieldLabel htmlFor="comment-body">Add comment</FieldLabel>
                <Textarea
                  id="comment-body"
                  onChange={(event) => setCommentBody(event.target.value)}
                  required
                  value={commentBody}
                />
                {internalUser ? (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      checked={isInternal}
                      onChange={(event) => setIsInternal(event.target.checked)}
                      type="checkbox"
                    />
                    Internal comment
                  </label>
                ) : null}
                <Button disabled={saving || !commentBody.trim()} type="submit">
                  Add comment
                </Button>
              </form>
            </Card>
            {internalUser && ticket.events?.length ? (
              <section aria-labelledby="history-title">
                <h2 id="history-title" className="mb-3 font-semibold">
                  Ticket history
                </h2>
                <ol className="divide-y divide-border">
                  {ticket.events.map((event) => (
                    <li key={event.id} className="py-3 text-sm">
                      <span className="font-medium">{titleCase(event.eventType)}</span>
                      <span className="ml-2 text-xs text-muted">{formatDate(event.createdAt)}</span>
                      {event.eventType !== 'ASSIGNEE_CHANGED' && event.toValue ? (
                        <p className="mt-1 text-muted">
                          {event.fromValue ? `${titleCase(event.fromValue)} to ` : ''}
                          {titleCase(event.toValue)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}
          </div>

          {internalUser ? (
            <Card>
              <CardHeader
                description="Advisory suggestion only — internal users make the final decision."
                title="Assisted triage"
              />
              <div className="space-y-4 p-5">
                {triageSuggestion ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      <Badge value={triageSuggestion.suggestedCategory} />
                      <Badge value={triageSuggestion.suggestedPriority} />
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                        Rule-match score: {triageSuggestion.confidenceScore}/100
                      </span>
                    </div>
                    <p className="text-sm text-slate-700">{triageSuggestion.summary}</p>
                    <p className="text-xs text-muted">Heuristic score, not a probability.</p>
                    <p className="rounded-md bg-slate-50 p-3 text-sm text-slate-700">
                      {triageSuggestion.suggestedNextAction}
                    </p>
                    <p
                      className={`text-sm font-semibold ${triageSuggestion.accepted ? 'text-emerald-700' : 'text-amber-800'}`}
                    >
                      {triageSuggestion.accepted ? 'Applied' : 'Pending review'}
                    </p>
                  </>
                ) : (
                  <div className="rounded-md border border-dashed border-border p-5 text-sm text-muted">
                    <Bot className="mb-3 h-6 w-6 text-brand-700" />
                    No suggestion saved for this ticket.
                  </div>
                )}

                {internalUser ? (
                  <div className="flex flex-col gap-2">
                    <Button
                      disabled={saving}
                      onClick={generateSuggestion}
                      type="button"
                      variant="secondary"
                    >
                      <RefreshCw className="h-4 w-4" />
                      {triageSuggestion ? 'Refresh suggestion' : 'Generate suggestion'}
                    </Button>
                    <Button
                      disabled={saving || !triageSuggestion || triageSuggestion.accepted}
                      onClick={applySuggestion}
                      type="button"
                    >
                      <WandSparkles className="h-4 w-4" />
                      {triageSuggestion?.accepted ? 'Applied' : 'Apply suggestion'}
                    </Button>
                  </div>
                ) : null}
              </div>
            </Card>
          ) : null}
        </div>
      ) : null}
    </ProtectedPage>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <p className="mt-1 break-words text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
