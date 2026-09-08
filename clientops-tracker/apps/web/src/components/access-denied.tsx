'use client';

import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

import { Card } from './ui/card';

export function AccessDenied() {
  return (
    <Card className="p-8 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
      <h1 className="mt-4 text-xl font-semibold text-ink">Access denied</h1>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Your current role does not have permission to use this section of ClientOps Tracker.
      </p>
      <Link
        className="mt-5 inline-flex h-10 items-center justify-center rounded-md border border-brand-700 bg-brand-700 px-4 text-sm font-semibold text-white transition hover:bg-brand-600"
        href="/dashboard"
      >
        Back to dashboard
      </Link>
    </Card>
  );
}
