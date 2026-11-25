'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck, UserCog, Users } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { FieldLabel, Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import Link from 'next/link';
import { ThemePicker } from '../../components/ui/preferences';
import { BrandMark } from '../../components/ui/brand-mark';
import { destinationAfterLogin } from '../../lib/return-destination';
import { LoginIntro } from '../../components/login-intro';

const demoUsers = [
  { label: 'Admin', email: 'admin@example.com', icon: ShieldCheck },
  { label: 'Developer', email: 'developer@example.com', icon: UserCog },
  { label: 'Client', email: 'client@example.com', icon: Users },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, status, sessionEnded, preserveDestination } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  useEffect(() => {
    void api
      .config()
      .then((config) => setDemoEnabled(config.demoEnabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace(destinationAfterLogin(window.location.search));
    }
  }, [router, status]);

  async function handleLogin(nextEmail = email, nextPassword = password) {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setError(null);

    try {
      await login(nextEmail, nextPassword);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-6 sm:py-10">
      <LoginIntro disabled={status === 'authenticated' || sessionEnded || !preserveDestination} />
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemePicker />
        </div>
        <div className="portal-feature">
          <section className="border-b border-border pb-5">
            <div>
              <BrandMark size={40} />
              <h1 className="portal-display-title mt-3">ClientOps Tracker</h1>
              <p className="mt-2 text-sm leading-6 text-muted">
                Support and delivery operations for your team and clients.
              </p>
            </div>
          </section>

          <section className="pt-5">
            <div>
              <h2 id="sign-in-heading" tabIndex={-1} className="portal-section-title text-ink">
                Sign in
              </h2>
            </div>

            {sessionEnded ? (
              <p role="status" className="mt-4 text-sm text-muted">
                Your session has ended. Sign in again to continue.
              </p>
            ) : null}
            <form
              className="portal-form mt-4 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
              <fieldset disabled={submitting} className="min-w-0 space-y-4">
                <legend className="sr-only">Sign-in credentials</legend>
                <div>
                  <FieldLabel htmlFor="login-email">Email</FieldLabel>
                  <Input
                    id="login-email"
                    required
                    autoComplete="email"
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    value={email}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                </div>
                <div>
                  <FieldLabel htmlFor="login-password">Password</FieldLabel>
                  <PasswordInput
                    id="login-password"
                    visibilityLabel="password"
                    required
                    autoComplete="current-password"
                    onChange={(event) => setPassword(event.target.value)}
                    value={password}
                    aria-invalid={!!error}
                    aria-describedby={error ? 'login-error' : undefined}
                  />
                </div>
              </fieldset>
              {error ? (
                <div
                  id="login-error"
                  role="alert"
                  className="break-words rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
                >
                  {error}
                </div>
              ) : null}
              <Button className="w-full" disabled={submitting} type="submit">
                <LogIn className="h-4 w-4" />
                {submitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
            <Link
              href="/forgot-password"
              className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-brand-700 underline"
            >
              Forgot password?
            </Link>
            {demoEnabled ? (
              <div className="mt-4 grid gap-2 border-t border-border pt-4">
                <p className="mb-1 text-xs font-medium text-muted">Disposable demo access</p>
                {demoUsers.map((demo) => {
                  const Icon = demo.icon;

                  return (
                    <Button
                      disabled={submitting}
                      key={demo.email}
                      onClick={() => {
                        setEmail(demo.email);
                        setPassword('password123');
                        void handleLogin(demo.email, 'password123');
                      }}
                      type="button"
                      variant="secondary"
                    >
                      <Icon className="h-4 w-4" />
                      Continue as {demo.label}
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}
