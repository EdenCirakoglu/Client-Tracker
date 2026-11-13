'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

import { Card } from './ui/card';

export function AccessDenied() {
  return (
    <Card className="portal-denied mx-auto max-w-xl p-8">
      <ShieldAlert className="h-7 w-7 text-muted" aria-hidden="true" />
      <h1 className="meridian-heading mt-4 text-[30px] text-ink">Access denied</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Your current role does not have permission to use this section of ClientOps Tracker.
      </p>
      <Link
        className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-action bg-action px-4 text-sm font-semibold text-white transition hover:brightness-110"
        href="/dashboard"
      >
        Back to dashboard
      </Link>
    </Card>
  );
}
