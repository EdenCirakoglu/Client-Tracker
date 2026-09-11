'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button } from './ui/button';
import { FieldLabel, Input } from './ui/input';
import { ThemePicker } from './ui/preferences';

export function AccountForm({ mode }: { mode: 'forgot' | 'invitation' | 'reset' | 'change' }) {
  const { refreshUser } = useAuth();
  const token = useRef('');
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const linkRequired = mode === 'invitation' || mode === 'reset';
  const title = {
    forgot: 'Reset your password',
    invitation: 'Set up your account',
    reset: 'Choose a new password',
    change: 'Change password',
  }[mode];
  useEffect(() => {
    function readLink() {
      if (linkRequired) {
        if (window.location.hash) {
          token.current = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
          window.history.replaceState(null, '', window.location.pathname);
          setMessage(null);
          setError(null);
          setPassword('');
          setConfirmation('');
        }
        if (!/^[a-f0-9]{64}$/.test(token.current))
          setError('This link is incomplete or no longer available. Request a new link.');
      }
      setReady(true);
    }
    readLink();
    window.addEventListener('hashchange', readLink);
    return () => window.removeEventListener('hashchange', readLink);
  }, [linkRequired]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (mode !== 'forgot' && password !== confirmation) {
      setError('Passwords do not match.');
      return;
    }
    if (mode !== 'forgot' && new TextEncoder().encode(password).length > 72) {
      setError('Use no more than 72 bytes for your password.');
      return;
    }
    setBusy(true);
    try {
      const result =
        mode === 'forgot'
          ? await api.forgotPassword(email)
          : mode === 'change'
            ? await api.changePassword(current, password)
            : await api.setPassword(token.current, password, mode === 'invitation');
      setMessage(result.message);
      setPassword('');
      setConfirmation('');
      setCurrent('');
      token.current = '';
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to complete this request.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto w-full max-w-md py-8">
      <h1 className="text-2xl font-semibold text-ink">{title}</h1>
      {message ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="text-sm text-brand-700">
            {message}
          </p>
          <Link
            href="/login"
            onClick={() => {
              if (mode === 'change') void refreshUser();
            }}
            className="inline-block font-medium text-brand-700 underline"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          {mode === 'forgot' ? (
            <div>
              <FieldLabel htmlFor="recovery-email">Email</FieldLabel>
              <Input
                id="recovery-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          ) : (
            <>
              {mode === 'change' ? (
                <div>
                  <FieldLabel htmlFor="current-password">Current password</FieldLabel>
                  <Input
                    id="current-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={current}
                    onChange={(event) => setCurrent(event.target.value)}
                  />
                </div>
              ) : null}
              <div>
                <FieldLabel htmlFor="new-password">New password</FieldLabel>
                <Input
                  id="new-password"
                  type="password"
                  autoComplete="new-password"
                  aria-describedby="password-requirements"
                  minLength={12}
                  required
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
                <p id="password-requirements" className="mt-1 text-xs text-muted">
                  At least 12 characters. A unique passphrase is recommended.
                </p>
              </div>
              <div>
                <FieldLabel htmlFor="confirm-password">Confirm password</FieldLabel>
                <Input
                  id="confirm-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={12}
                  required
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </div>
            </>
          )}
          {error ? (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          ) : null}
          <Button type="submit" disabled={busy || !ready || (linkRequired && !token.current)}>
            {mode === 'forgot' ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {busy ? 'Submitting...' : mode === 'forgot' ? 'Send reset link' : 'Save password'}
          </Button>
          <p className="text-sm">
            <Link
              className="text-brand-700 underline"
              href={mode === 'reset' ? '/forgot-password' : '/login'}
            >
              {mode === 'reset' ? 'Request another link' : 'Back to sign in'}
            </Link>
          </p>
          {mode === 'invitation' ? (
            <p className="text-sm text-muted">
              Need another invitation? Contact your workspace administrator.
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}
export function PublicAccountPage({ mode }: { mode: 'forgot' | 'invitation' | 'reset' }) {
  return (
    <main className="min-h-screen bg-surface px-4 py-12">
      <div className="mx-auto max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemePicker />
        </div>
        <div className="rounded-lg border border-border bg-panel p-6 sm:p-8">
          <Link href="/login" className="text-sm font-semibold text-brand-700">
            ClientOps Tracker
          </Link>
          <AccountForm mode={mode} />
        </div>
      </div>
    </main>
  );
}
