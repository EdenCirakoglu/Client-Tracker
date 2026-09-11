import { AlertCircle, Inbox, Loader2 } from 'lucide-react';

import { Button } from './button';

export function LoadingState({ label = 'Loading data...' }: { label?: string }) {
  return (
    <div role="status" className="flex min-h-24 items-center justify-center p-6 text-sm text-muted">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-800"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-5 w-5" />
        <div className="min-w-0">
          <p className="font-semibold">Something went wrong</p>
          <p className="mt-1">{message}</p>
          {onRetry ? (
            <Button className="mt-4" type="button" variant="secondary" onClick={onRetry}>
              Retry
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-panel p-8 text-center">
      <Inbox className="mx-auto h-8 w-8 text-slate-400" />
      <h3 className="mt-3 text-sm font-semibold text-ink">{title}</h3>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted">{description}</p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
