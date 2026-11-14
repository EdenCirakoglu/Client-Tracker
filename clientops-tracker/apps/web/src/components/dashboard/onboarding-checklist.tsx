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
    <section aria-labelledby="onboarding-heading" className="portal-section">
      <h2 id="onboarding-heading" className="portal-section-title">
        Installation setup
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
          <details className="mt-3">
            <summary className="min-h-11 cursor-pointer py-3 text-sm font-medium">
              Installation checklist
            </summary>
            <p className="mt-3 text-xs leading-5 text-muted">
              These steps count records across all clients, not one client's completed onboarding.
            </p>
            <ol className="mt-3 divide-y divide-border">
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
