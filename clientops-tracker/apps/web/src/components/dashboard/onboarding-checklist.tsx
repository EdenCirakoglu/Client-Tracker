'use client';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { api } from '../../lib/api';
import { useApiData } from '../../lib/use-api-data';
import { ErrorState, LoadingState } from '../ui/states';

interface OnboardingChecklistProps {
  refresh: number;
}
export function OnboardingChecklist({ refresh }: OnboardingChecklistProps) {
  const state = useApiData(api.onboarding, [refresh]);
  return (
    <section aria-labelledby="onboarding-heading" className="mb-6 border-b border-border pb-5">
      <h2 id="onboarding-heading" className="text-lg font-semibold">
        Get your first client started
      </h2>
      {state.loading ? (
        <LoadingState label="Checking setup..." />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <p className="mt-1 text-xs text-muted">
            {state.data.completed} of {state.data.steps.length} steps complete. {state.data.scope}.
          </p>
          <details className="mt-3" open={state.data.completed < state.data.steps.length}>
            <summary className="cursor-pointer text-sm font-medium">Setup checklist</summary>
            <ol className="mt-3 grid gap-x-6 sm:grid-cols-2">
              {state.data.steps.map((step) => (
                <li key={step.key}>
                  <Link
                    href={step.href}
                    className="flex min-h-11 items-center gap-3 py-2 text-sm hover:text-brand-700"
                  >
                    {step.complete ? (
                      <CheckCircle2
                        aria-hidden="true"
                        className="h-4 w-4 shrink-0 text-brand-700"
                      />
                    ) : (
                      <Circle aria-hidden="true" className="h-4 w-4 shrink-0 text-muted" />
                    )}
                    <span className="min-w-0 flex-1 break-words">
                      <span className="sr-only">
                        {step.complete ? 'Complete: ' : 'Next step: '}
                      </span>
                      {step.title}
                    </span>
                    <ArrowRight aria-hidden="true" className="h-4 w-4 shrink-0" />
                  </Link>
                </li>
              ))}
            </ol>
          </details>
        </>
      ) : null}
    </section>
  );
}
