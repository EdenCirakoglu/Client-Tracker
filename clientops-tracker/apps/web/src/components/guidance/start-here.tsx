'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useAuth } from '../../lib/auth';

export function StartHere() {
  const { user } = useAuth();
  if (!user) return null;
  const task =
    user.role === 'ADMIN'
      ? {
          title: 'Set up your first client',
          href: '/guide',
          action: 'Set up a client',
          detail:
            'Choose one client, create their project and invite the person who will review the work.',
        }
      : user.role === 'DEVELOPER'
        ? {
            title: 'Deliver a change for review',
            href: `/tickets?status=UNRESOLVED&assignedToId=${user.id}`,
            action: 'Open my work',
            detail:
              'Start with your assigned request. Agree the outcome before linking a release and requesting acceptance.',
          }
        : {
            title: 'Make a request, then review the result',
            href: '/tickets/new',
            action: 'Create ticket',
            detail:
              'Describe what you need. Decisions assigned to you appear below; a release alone does not mean you accepted it.',
          };
  return (
    <details className="mb-6 border-b border-border pb-4">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold">
        Start here: {task.title}
      </summary>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{task.detail}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-6">
        <Link
          className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-brand-700"
          href={task.href}
        >
          {task.action}
          <ArrowRight aria-hidden="true" className="h-4 w-4" />
        </Link>
        {user.role !== 'ADMIN' ? (
          <Link
            href="/guide"
            className="inline-flex min-h-11 items-center text-sm text-muted underline"
          >
            How do I...?
          </Link>
        ) : null}
      </div>
    </details>
  );
}
