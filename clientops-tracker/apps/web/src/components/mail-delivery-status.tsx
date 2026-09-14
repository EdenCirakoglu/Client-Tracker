'use client';
import { RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useApiData } from '../lib/use-api-data';
import { formatDateTime, titleCase } from '../lib/format';
import { Button } from './ui/button';
import { ErrorState, LoadingState } from './ui/states';
import { DataTable, Th, Td } from './ui/table';

interface DeliveryStatusProps {
  refresh: string;
}
export function MailDeliveryStatus({ refresh }: DeliveryStatusProps) {
  const state = useApiData(api.mailDeliveries, [refresh]);
  return (
    <section
      aria-labelledby="mail-delivery-heading"
      className="mt-8 min-w-0 border-t border-border pt-6"
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 id="mail-delivery-heading" className="text-lg font-semibold">
          Email delivery
        </h2>
        <Button
          variant="secondary"
          onClick={state.reload}
          disabled={state.loading}
          aria-label="Refresh email delivery"
        >
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>
      {state.loading ? (
        <LoadingState label="Checking delivery..." />
      ) : state.error ? (
        <ErrorState message={state.error} onRetry={state.reload} />
      ) : state.data ? (
        <>
          <p className="mb-4 text-sm text-muted">
            {state.data.summary
              .filter((item) => ['PENDING', 'SENDING'].includes(item.status))
              .reduce((sum, item) => sum + item.count, 0)}{' '}
            pending &middot;{' '}
            {state.data.summary.find((item) => item.status === 'FAILED')?.count ?? 0} failed
          </p>
          {state.data.recent.length ? (
            <DataTable>
              <thead>
                <tr>
                  <Th>Email</Th>
                  <Th>Status</Th>
                  <Th>Attempts</Th>
                  <Th>Requested</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {state.data.recent.map((item) => (
                  <tr key={item.id}>
                    <Td>{item.kind === 'INVITATION' ? 'Invitation' : 'Password recovery'}</Td>
                    <Td>
                      {item.status === 'DELIVERED'
                        ? 'Accepted by mail server'
                        : item.status === 'FAILED'
                          ? 'Failed; request a new link after resolving delivery'
                          : titleCase(item.status)}
                    </Td>
                    <Td>{item.attempts}</Td>
                    <Td>{formatDateTime(item.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          ) : (
            <p className="text-sm text-muted">No account emails requested yet.</p>
          )}
        </>
      ) : null}
    </section>
  );
}
