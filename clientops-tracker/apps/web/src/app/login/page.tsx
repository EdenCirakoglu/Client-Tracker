'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck, UserCog, Users } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { FieldLabel, Input } from '../../components/ui/input';
import { PasswordInput } from '../../components/ui/password-input';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import Link from 'next/link';
import { ThemePicker } from '../../components/ui/preferences';

const demoUsers = [
  { label: 'Admin', email: 'admin@example.com', icon: ShieldCheck },
  { label: 'Developer', email: 'developer@example.com', icon: UserCog },
  { label: 'Client', email: 'client@example.com', icon: Users },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, status, sessionEnded } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoEnabled, setDemoEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => {
    void api
      .config()
      .then((config) => setDemoEnabled(config.demoEnabled))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [router, status]);

  async function handleLogin(nextEmail = email, nextPassword = password) {
    setSubmitting(true);
    setError(null);

    try {
      await login(nextEmail, nextPassword);
      router.replace('/dashboard');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex justify-end">
          <ThemePicker />
        </div>
        <div className="overflow-hidden rounded-lg border border-border bg-panel">
          <section className="border-b border-border p-6 sm:p-8">
            <div>
              <div className="grid h-10 w-10 place-items-center rounded-lg bg-action text-sm font-bold text-white">
                CT
              </div>
              <h1 className="mt-4 text-[28px] font-semibold leading-tight">ClientOps Tracker</h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                Support and delivery operations for your team and clients.
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-8">
            <div>
              <h2 className="text-xl font-semibold text-ink">Sign in</h2>
            </div>

            {sessionEnded ? (
              <p role="status" className="mt-4 text-sm text-muted">
                Your session has ended. Sign in again to continue.
              </p>
            ) : null}
            <form
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                void handleLogin();
              }}
            >
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
              {error ? (
                <div
                  id="login-error"
                  role="alert"
                  className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
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
              className="mt-4 inline-block text-sm font-medium text-brand-700 underline"
            >
              Forgot password?
            </Link>
            {demoEnabled ? (
              <div className="mt-6 grid gap-2">
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
