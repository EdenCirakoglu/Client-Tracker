import { titleCase } from '../../lib/format';

const toneMap: Record<string, string> = {
  CRITICAL: 'status-danger',
  HIGH: 'status-warning',
  MEDIUM: 'status-neutral',
  LOW: 'status-neutral',
  OPEN: 'status-info',
  IN_PROGRESS: 'status-info',
  WAITING_FOR_CLIENT: 'status-warning',
  RESOLVED: 'status-success',
  CLOSED: 'status-success',
  ACTIVE: 'status-success',
  PAUSED: 'status-warning',
  COMPLETED: 'status-success',
  SECURITY: 'status-danger',
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`status-badge inline-flex whitespace-nowrap rounded-md px-2 py-1 text-xs font-medium ${toneMap[value] ?? 'status-neutral'}`}
    >
      {titleCase(value)}
    </span>
  );
}
