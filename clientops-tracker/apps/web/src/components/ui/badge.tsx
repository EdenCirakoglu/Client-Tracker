import { titleCase } from '../../lib/format';

const toneMap: Record<string, string> = {
  CRITICAL: 'bg-red-50 text-red-700 ring-red-200',
  HIGH: 'bg-orange-50 text-orange-700 ring-orange-200',
  MEDIUM: 'bg-amber-50 text-amber-700 ring-amber-200',
  LOW: 'bg-slate-50 text-slate-700 ring-slate-200',
  OPEN: 'bg-blue-50 text-blue-700 ring-blue-200',
  IN_PROGRESS: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  WAITING_FOR_CLIENT: 'bg-purple-50 text-purple-700 ring-purple-200',
  RESOLVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  CLOSED: 'bg-slate-100 text-slate-600 ring-slate-200',
  ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  PAUSED: 'bg-amber-50 text-amber-700 ring-amber-200',
  COMPLETED: 'bg-slate-100 text-slate-600 ring-slate-200',
  SECURITY: 'bg-red-50 text-red-700 ring-red-200',
  PERFORMANCE: 'bg-orange-50 text-orange-700 ring-orange-200',
  BUG: 'bg-rose-50 text-rose-700 ring-rose-200',
  FEATURE_REQUEST: 'bg-cyan-50 text-cyan-700 ring-cyan-200',
  SUPPORT: 'bg-slate-50 text-slate-700 ring-slate-200',
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${toneMap[value] ?? 'bg-slate-50 text-slate-700 ring-slate-200'}`}
    >
      {titleCase(value)}
    </span>
  );
}
