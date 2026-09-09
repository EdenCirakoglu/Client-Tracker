'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogIn, ShieldCheck, UserCog, Users } from 'lucide-react';

import { Button } from '../../components/ui/button';
import { FieldLabel, Input } from '../../components/ui/input';
import { useAuth } from '../../lib/auth';

const demoUsers = [
  { label: 'Admin', email: 'admin@example.com', icon: ShieldCheck },
  { label: 'Developer', email: 'developer@example.com', icon: UserCog },
  { label: 'Client', email: 'client@example.com', icon: Users },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, status } = useAuth();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password123');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
      <div className="w-full max-w-5xl">
        <div className="grid overflow-hidden rounded-lg border border-border bg-white shadow-soft lg:grid-cols-[1fr_420px]">
          <section className="flex flex-col justify-between bg-ink p-8 text-white">
            <div>
              <div className="grid h-11 w-11 place-items-center rounded-md bg-white text-sm font-bold text-ink">
                CT
              </div>
              <h1 className="mt-8 max-w-xl text-3xl font-semibold leading-tight">
                ClientOps Tracker
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300">
                ClientOps Tracker helps software teams manage clients, projects, support tickets,
                releases, and delivery workflow.
              </p>
            </div>
          </section>

          <section className="p-6 sm:p-8">
            <div>
              <p className="text-sm font-semibold text-brand-700">Welcome back</p>
              <h2 className="mt-2 text-2xl font-semibold text-ink">Sign in to ClientOps</h2>
              <p className="mt-2 text-sm text-muted">Sign in to your workspace.</p>
            </div>

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
                />
              </div>
              <div>
                <FieldLabel htmlFor="login-password">Password</FieldLabel>
                <Input
                  id="login-password"
                  required
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  value={password}
                />
              </div>
              {error ? (
                <div
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

            <div className="mt-6 grid gap-2">
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
          </section>
        </div>
      </div>
    </main>
  );
}
