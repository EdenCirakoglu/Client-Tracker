'use client';
import { useEffect, useState } from 'react';
import { Mail, Save, X } from 'lucide-react';
import { ProtectedPage } from '../../components/app-shell';
import { Button } from '../../components/ui/button';
import { FieldLabel, Input, Select } from '../../components/ui/input';
import { api, type Account } from '../../lib/api';
import { useAuth } from '../../lib/auth';
import type { Client, UserRole } from '../../lib/types';
import Link from 'next/link';

function Accounts() {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [editing, setEditing] = useState<Account | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('DEVELOPER');
  const [clientId, setClientId] = useState('');
  const [disabled, setDisabled] = useState(false);
  const [busy, setBusy] = useState(false);
  async function load() {
    try {
      const [nextAccounts, nextClients] = await Promise.all([api.users(), api.clients()]);
      setAccounts(nextAccounts);
      setClients(nextClients);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (user?.role === 'ADMIN') void load();
  }, [user?.role]);
  function reset() {
    setEditing(null);
    setName('');
    setEmail('');
    setRole('DEVELOPER');
    setClientId('');
    setDisabled(false);
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
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
        setMessage('Invitation sent.');
      }
      reset();
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save account.');
    } finally {
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
      <h1 className="text-2xl font-semibold text-ink">Accounts</h1>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {message ? (
        <p role="status" className="mt-4 text-sm text-brand-700">
          {message}
        </p>
      ) : null}
      <div className="mt-6 grid gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Workspace accounts">
          {loading ? (
            <p role="status">Loading accounts...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
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
                    <tr className="border-b border-border" key={account.id}>
                      <td className="p-3">
                        <p className="font-medium">{account.name}</p>
                        <p className="text-muted">{account.email}</p>
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
                          onClick={() => {
                            setEditing(account);
                            setName(account.name);
                            setEmail(account.email);
                            setRole(account.role);
                            setClientId(account.clientId ?? '');
                            setDisabled(account.accountStatus === 'DISABLED');
                            setMessage(null);
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
        <section>
          <h2 className="text-lg font-semibold">
            {editing ? 'Manage account' : 'Invite a teammate or client'}
          </h2>
          <form className="mt-4 space-y-4" onSubmit={(event) => void submit(event)}>
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
            <div className="flex gap-2">
              <Button type="submit" disabled={busy}>
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
          </form>
        </section>
      </div>
    </>
  );
}
export default function Page() {
  return (
    <ProtectedPage>
      <Accounts />
    </ProtectedPage>
  );
}
