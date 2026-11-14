'use client';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ErrorState, LoadingState } from '../../components/ui/states';
import { PageHeader } from '../../components/page-header';
import { Mail, Save, X } from 'lucide-react';
import { ProtectedPage } from '../../components/app-shell';
import { Button } from '../../components/ui/button';
import { FieldLabel, Input, Select } from '../../components/ui/input';
import { api, type Account } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Client, UserRole } from '../../lib/types';
import Link from 'next/link';
import { MailDeliveryStatus } from '../../components/mail-delivery-status';

function Accounts() {
  const selectedClient = useSearchParams().get('clientId') ?? '';
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('DEVELOPER');
  const [clientId, setClientId] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  async function load() {
    setLoading(true);
    setLoadError(null);
    try {
      const [nextAccounts, nextClients] = await Promise.all([api.users(), api.clients()]);
      setAccounts(nextAccounts);
      setClients(nextClients);
    } catch (caught) {
      setLoadError(caught instanceof Error ? caught.message : 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role === 'ADMIN') void load();
  }, [user?.role]);
  useEffect(() => {
    if (clients.some((client) => client.id === selectedClient)) {
      setRole('CLIENT');
      setClientId(selectedClient);
    }
  }, [clients, selectedClient]);
  function reset() {
    setEditing(null);
    setName('');
    setEmail('');
    setRole('DEVELOPER');
    setClientId('');
    setDisabled(false);
    setError(null);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const assignment = { role, clientId: role === 'CLIENT' ? clientId : null };
      if (editing && editing.accountStatus !== 'INVITED') {
        await api.updateAccount(editing.id, { ...assignment, disabled });
        setMessage('Account updated. Previous sessions have ended.');
      } else {
        await api.invite({ name, email, ...assignment });
        setMessage('Invitation queued.');
      }
      reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save account.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  if (user?.role !== 'ADMIN')
    return (
      <section>
        <h1 className="text-2xl font-semibold">Access denied</h1>
        <Link className="text-brand-700 underline" href="/dashboard">
          Back to dashboard
        </Link>
      </section>
    );
  return (
    <>
      <PageHeader
        title="Accounts"
        description="Workspace access, invitations and client contacts."
        action={
          <a
            href="#invite-account"
            aria-disabled={busy}
            onClick={(event) => {
              if (submitting.current) {
                event.preventDefault();
                return;
              }
              reset();
              if (clients.some((client) => client.id === selectedClient)) {
                setRole('CLIENT');
                setClientId(selectedClient);
              }
              setMessage(null);
              requestAnimationFrame(() => document.getElementById('account-name')?.focus());
            }}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
          >
            <Mail className="h-4 w-4" />
            Invite account
          </a>
        }
      />
      {clients.some((client) => client.id === selectedClient) ? (
        <Link
          className="mt-2 inline-flex min-h-11 items-center text-sm text-brand-700 underline"
          href={`/guide?clientId=${selectedClient}`}
        >
          Back to this client's setup
        </Link>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm text-brand-700">
          {message}
        </p>
      ) : null}
      <div className="portal-workspace mt-6">
        <section aria-label="Workspace accounts" className="portal-section min-w-0">
          <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="portal-section-title">Workspace accounts</h2>
            {!loading && !loadError ? (
              <p className="portal-kicker">{accounts.length} accounts</p>
            ) : null}
          </div>
          {loading ? (
            <LoadingState label="Loading accounts..." />
          ) : loadError ? (
            <ErrorState message={loadError} onRetry={load} />
          ) : !accounts.length ? (
            <p role="status" className="py-4 text-sm text-muted">
              No accounts found.
            </p>
          ) : (
            <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Accounts table">
              <table className="portal-records w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-3">Name</th>
                    <th className="p-3">Role</th>
                    <th className="p-3">Organisation</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((account) => (
                    <tr className="portal-row border-b border-border" key={account.id}>
                      <td className="p-3">
                        <p className="font-semibold">{account.name}</p>
                        <p className="break-words text-xs text-muted">{account.email}</p>
                      </td>
                      <td className="p-3">
                        {account.role === 'ADMIN'
                          ? 'Administrator'
                          : account.role === 'CLIENT'
                            ? 'Client'
                            : 'Developer'}
                      </td>
                      <td className="p-3">
                        {clients.find((client) => client.id === account.clientId)?.name ??
                          'Internal team'}
                      </td>
                      <td className="p-3">
                        {account.accountStatus === 'INVITED'
                          ? 'Invitation pending'
                          : account.accountStatus === 'DISABLED'
                            ? 'Disabled'
                            : 'Active'}
                      </td>
                      <td className="p-3">
                        <Button
                          variant="secondary"
                          disabled={busy}
                          onClick={() => {
                            setEditing(account);
                            setName(account.name);
                            setEmail(account.email);
                            setRole(account.role);
                            setClientId(account.clientId ?? '');
                            setDisabled(account.accountStatus === 'DISABLED');
                            setMessage(null);
                            setError(null);
                            document.getElementById('account-role')?.focus();
                          }}
                        >
                          {account.accountStatus === 'INVITED' ? 'Resend' : 'Edit'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="portal-support" aria-labelledby="account-editor-title">
          <p className="portal-kicker">{editing ? editing.email : 'Access management'}</p>
          <h2 id="account-editor-title" className="portal-section-title">
            {editing ? 'Manage account' : 'Invite a teammate or client'}
          </h2>
          <form
            id="invite-account"
            className="portal-form mt-4 scroll-mt-24 space-y-4"
            onSubmit={(event) => void submit(event)}
          >
            <fieldset disabled={busy} className="min-w-0 space-y-4">
              <div>
                <FieldLabel htmlFor="account-name">Name</FieldLabel>
                <Input
                  id="account-name"
                  required
                  maxLength={120}
                  value={name}
                  disabled={!!editing}
                  onChange={(event) => setName(event.target.value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="account-email">Email</FieldLabel>
                <Input
                  id="account-email"
                  type="email"
                  required
                  value={email}
                  disabled={!!editing}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="account-role">Role</FieldLabel>
                <Select
                  id="account-role"
                  value={role}
                  onChange={(event) => setRole(event.target.value as UserRole)}
                >
                  <option value="ADMIN">Administrator</option>
                  <option value="DEVELOPER">Developer</option>
                  <option value="CLIENT">Client</option>
                </Select>
              </div>
              {role === 'CLIENT' ? (
                <div>
                  <FieldLabel htmlFor="account-client">Organisation</FieldLabel>
                  <Select
                    id="account-client"
                    disabled={loading || !!loadError}
                    required
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                  >
                    <option value="">Choose organisation</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </Select>
                  {!loading && !loadError && !clients.length ? (
                    <p className="mt-2 text-sm text-muted">
                      No client organisations yet.{' '}
                      <Link href="/clients" className="text-brand-700 underline">
                        Create client
                      </Link>
                    </p>
                  ) : null}
                </div>
              ) : null}
              {editing && editing.accountStatus !== 'INVITED' ? (
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={disabled}
                    onChange={(event) => setDisabled(event.target.checked)}
                  />
                  Disable account
                </label>
              ) : null}
              {error ? (
                <p role="alert" className="break-words text-sm text-red-700">
                  {error}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button type="submit" disabled={busy || loading || !!loadError}>
                  {editing && editing.accountStatus !== 'INVITED' ? (
                    <Save className="h-4 w-4" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                  {busy
                    ? 'Saving...'
                    : editing && editing.accountStatus !== 'INVITED'
                      ? 'Save account'
                      : 'Send invitation'}
                </Button>
                {editing ? (
                  <Button variant="secondary" onClick={reset} type="button">
                    <X className="h-4 w-4" />
                    Cancel
                  </Button>
                ) : null}
              </div>
            </fieldset>
          </form>
        </section>
      </div>
      <MailDeliveryStatus refresh={message ?? ''} />
    </>
  );
}
export default function Page() {
  return (
    <ProtectedPage>
      <Suspense fallback={<LoadingState />}>
        <Accounts />
      </Suspense>
    </ProtectedPage>
  );
}
