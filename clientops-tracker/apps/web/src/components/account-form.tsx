'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { KeyRound, Mail } from 'lucide-react';
import { api, ApiError } from '../lib/api';
import { Button } from './ui/button';
import { FieldLabel, Input } from './ui/input';
import { ThemePicker } from './ui/preferences';
import { PasswordInput } from './ui/password-input';
import { BrandMark } from './ui/brand-mark';

interface AccountFormProps {
  mode: 'forgot' | 'invitation' | 'reset' | 'change';
  onPasswordChanged?: () => void;
}
export function AccountForm({ mode, onPasswordChanged }: AccountFormProps) {
  const token = useRef('');
  const [ready, setReady] = useState(false);
  const [email, setEmail] = useState('');
  const [current, setCurrent] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [invalidLink, setInvalidLink] = useState(false);
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const linkRequired = mode === 'invitation' || mode === 'reset';
  const title = message
    ? mode === 'forgot'
      ? 'Check your inbox'
      : mode === 'invitation'
        ? 'Account ready'
        : 'Password updated'
    : invalidLink
      ? 'Link unavailable'
      : error
        ? mode === 'forgot'
          ? 'Request could not be sent'
          : 'Check your password'
        : {
            forgot: 'Reset your password',
            invitation: 'Set up your account',
            reset: 'Choose a new password',
            change: 'Change password',
          }[mode];
  useEffect(() => {
    if (message || error) heading.current?.focus();
  }, [message, error]);
  useEffect(() => {
    function readLink() {
      if (linkRequired) {
        if (window.location.hash) {
          token.current = new URLSearchParams(window.location.hash.slice(1)).get('token') ?? '';
          window.history.replaceState(null, '', window.location.pathname);
          setMessage(null);
          setError(null);
          setInvalidLink(false);
          setInvalidField(null);
          setPassword('');
          setConfirmation('');
        }
        if (!/^[a-f0-9]{64}$/.test(token.current)) {
          setInvalidLink(true);
          setError('This link is incomplete or no longer available. Request a new link.');
        }
      }
      setReady(true);
    }
    readLink();
    window.addEventListener('hashchange', readLink);
    return () => window.removeEventListener('hashchange', readLink);
  }, [linkRequired]);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (submitting.current) return;
    setError(null);
    setInvalidField(null);
    if (mode !== 'forgot' && password !== confirmation) {
      setInvalidField('confirm-password');
      setError('Passwords do not match.');
      return;
    }
    if (mode !== 'forgot' && new TextEncoder().encode(password).length > 72) {
      setInvalidField('new-password');
      setError('Use no more than 72 bytes for your password.');
      return;
    }
    submitting.current = true;
    setBusy(true);
    try {
      const result =
        mode === 'forgot'
          ? await api.forgotPassword(email)
          : mode === 'change'
            ? await api.changePassword(current, password)
            : await api.setPassword(token.current, password, mode === 'invitation');
      setMessage(result.message);
      if (mode === 'change') onPasswordChanged?.();
      setPassword('');
      setConfirmation('');
      setCurrent('');
      token.current = '';
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'LINK_INVALID') {
        setInvalidLink(true);
        token.current = '';
      }
      if (caught instanceof ApiError && caught.code === 'INVALID_PASSWORD')
        setInvalidField('current-password');
      setError(caught instanceof Error ? caught.message : 'Unable to complete this request.');
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <section
      className={
        mode === 'change' ? 'portal-section w-full max-w-xl' : 'portal-section w-full pt-6'
      }
    >
      <p className="portal-kicker">
        {mode === 'change'
          ? 'Account security'
          : mode === 'invitation'
            ? 'Invitation'
            : 'Account recovery'}
      </p>
      <h1 ref={heading} tabIndex={-1} className="portal-display-title break-words text-ink">
        {title}
      </h1>
      {message ? (
        <div className="mt-6 space-y-4">
          <p role="status" className="break-words text-sm text-brand-700">
            {message}
          </p>
          {mode === 'forgot' ? (
            <p className="text-sm text-muted">
              If a reset email arrives, open the newest link within 30 minutes. Check your spam
              folder. Still need help? Contact your workspace administrator.
            </p>
          ) : null}
          {/* Start a new document after credential changes; cached auth state is no longer valid. */}
          <a href="/login" className="inline-block font-medium text-brand-700 underline">
            Sign in
          </a>
        </div>
      ) : (
        <form className="portal-form mt-6 space-y-4" onSubmit={(event) => void submit(event)}>
          {mode === 'change' ? (
            <p className="text-sm text-muted">
              Changing your password ends all sessions, including this one. You will need to sign in
              again.
            </p>
          ) : null}
          <fieldset disabled={busy || !ready} className="min-w-0 space-y-4">
            <legend className="sr-only">
              {mode === 'forgot' ? 'Recovery email' : 'Password details'}
            </legend>
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
                    <PasswordInput
                      id="current-password"
                      visibilityLabel="current password"
                      aria-invalid={invalidField === 'current-password'}
                      aria-describedby={
                        invalidField === 'current-password' ? 'account-error' : undefined
                      }
                      autoComplete="current-password"
                      required
                      value={current}
                      onChange={(event) => setCurrent(event.target.value)}
                    />
                  </div>
                ) : null}
                <div>
                  <FieldLabel htmlFor="new-password">New password</FieldLabel>
                  <PasswordInput
                    id="new-password"
                    visibilityLabel="new password"
                    disabled={invalidLink}
                    autoComplete="new-password"
                    aria-invalid={invalidField === 'new-password'}
                    aria-describedby={`password-requirements${invalidField === 'new-password' ? ' account-error' : ''}`}
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
                  <PasswordInput
                    id="confirm-password"
                    visibilityLabel="confirmation password"
                    disabled={invalidLink}
                    aria-invalid={invalidField === 'confirm-password'}
                    aria-describedby={
                      invalidField === 'confirm-password' ? 'account-error' : undefined
                    }
                    autoComplete="new-password"
                    minLength={12}
                    required
                    value={confirmation}
                    onChange={(event) => setConfirmation(event.target.value)}
                  />
                </div>
              </>
            )}
          </fieldset>
          {error ? (
            <p
              id="account-error"
              role="alert"
              className="break-words border-l-2 border-red-700 pl-3 text-sm text-red-700"
            >
              {error}
            </p>
          ) : null}
          <Button
            className="h-auto min-h-11 w-full whitespace-normal py-2 sm:w-auto"
            type="submit"
            disabled={busy || !ready || (linkRequired && !token.current)}
          >
            {mode === 'forgot' ? <Mail className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
            {busy
              ? 'Submitting...'
              : mode === 'forgot'
                ? 'Send reset link'
                : mode === 'invitation'
                  ? 'Set up account'
                  : mode === 'change'
                    ? 'Change password'
                    : 'Update password'}
          </Button>
          <p className="text-sm">
            <Link
              className="inline-flex min-h-11 items-center text-brand-700 underline"
              href={
                mode === 'change' ? '/dashboard' : mode === 'reset' ? '/forgot-password' : '/login'
              }
            >
              {mode === 'change'
                ? 'Cancel'
                : mode === 'reset'
                  ? 'Request another link'
                  : 'Back to sign in'}
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
    <main className="min-h-screen bg-surface px-4 py-6 sm:py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemePicker />
        </div>
        <div className="portal-feature">
          <Link
            href="/login"
            className="inline-flex items-center gap-3 text-sm font-semibold text-brand-700"
          >
            <BrandMark />
            ClientOps Tracker
          </Link>
          <AccountForm mode={mode} />
        </div>
      </div>
    </main>
  );
}
