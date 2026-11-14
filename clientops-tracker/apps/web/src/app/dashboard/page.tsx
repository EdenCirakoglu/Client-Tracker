'use client';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { ProtectedPage } from '../../components/app-shell';
import { Button } from '../../components/ui/button';
import { NeedsAttention } from '../../components/dashboard/needs-attention';
import { DeliveryFollowUp } from '../../components/dashboard/delivery-follow-up';
import { ClientSetupSummary } from '../../components/dashboard/client-setup-summary';
import { DashboardSnapshot } from '../../components/dashboard/dashboard-snapshot';
import { OnboardingChecklist } from '../../components/dashboard/onboarding-checklist';
import { RecentActivity, RecentReleases } from '../../components/dashboard/recent-activity';
import { useAuth } from '../../lib/auth';

export default function DashboardPage() {
  const { user } = useAuth();
  const [refresh, setRefresh] = useState(0);
  const client = user?.role === 'CLIENT';
  const developer = user?.role === 'DEVELOPER';
  return (
    <ProtectedPage>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="portal-kicker mb-2">{client ? 'Client journal' : 'Overview'}</p>
          <h1 className="portal-display-title break-words">
            {client ? 'Your delivery journal' : developer ? 'Your work' : 'Client operations'}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="secondary"
            aria-label="Refresh"
            title="Refresh dashboard"
            onClick={() => setRefresh((value) => value + 1)}
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Link
            href="/tickets/new"
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-action px-3 text-sm font-semibold text-white sm:hidden"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New ticket
          </Link>
        </div>
      </div>
      {user ? (
        <div key={user.id} className="portal-dashboard">
          {user.role === 'ADMIN' ? <ClientSetupSummary refresh={refresh} /> : null}
          <div className="portal-workspace">
            <div className="portal-primary-stack">
              {client ? <DeliveryFollowUp refresh={refresh} personal /> : null}
              {developer ? (
                <NeedsAttention key={user.id} role={user.role} refresh={refresh} />
              ) : null}
              {user.role === 'ADMIN' ? <DeliveryFollowUp refresh={refresh} /> : null}
              {!developer ? (
                <NeedsAttention key={user.id} role={user.role} refresh={refresh} />
              ) : null}
            </div>
            <aside className="portal-support" aria-label="Supporting information">
              {developer ? (
                <Link
                  href="/delivery"
                  className="inline-flex min-h-11 items-center text-sm font-semibold text-brand-700"
                >
                  Team delivery follow-ups
                </Link>
              ) : null}
              <DashboardSnapshot refresh={refresh} />
              <RecentReleases refresh={refresh} />
              <RecentActivity key={user.id + '-' + refresh} refresh={refresh} client={client} />
              {user.role === 'ADMIN' ? <OnboardingChecklist refresh={refresh} /> : null}
              <Link
                href="/guide"
                className="inline-flex min-h-11 items-center text-sm text-brand-700 underline"
              >
                {user.role === 'ADMIN' ? 'Client setup guide' : 'Help and guidance'}
              </Link>
            </aside>
          </div>
        </div>
      ) : null}
    </ProtectedPage>
  );
}
