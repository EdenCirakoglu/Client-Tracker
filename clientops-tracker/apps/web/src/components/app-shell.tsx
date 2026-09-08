'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  LogOut,
  Menu,
  Rocket,
  Ticket,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useAuth } from '../lib/auth';
import type { UserRole } from '../lib/types';
import { Badge } from './ui/badge';
import { LoadingState } from './ui/states';

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: BarChart3,
    roles: ['ADMIN', 'DEVELOPER', 'CLIENT'],
  },
  { label: 'Clients', href: '/clients', icon: Building2, roles: ['ADMIN', 'DEVELOPER'] },
  {
    label: 'Projects',
    href: '/projects',
    icon: BriefcaseBusiness,
    roles: ['ADMIN', 'DEVELOPER', 'CLIENT'],
  },
  { label: 'Tickets', href: '/tickets', icon: Ticket, roles: ['ADMIN', 'DEVELOPER', 'CLIENT'] },
  { label: 'Releases', href: '/releases', icon: Rocket, roles: ['ADMIN', 'DEVELOPER', 'CLIENT'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sidebarOpen) return;
    const navigation = navigationRef.current;
    if (!navigation) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(navigation.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
    focusable()[0]?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setSidebarOpen(false);
      }
      if (event.key !== 'Tab') return;
      const elements = focusable();
      const first = elements[0];
      const last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 1024px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setSidebarOpen(false);
    };
    document.addEventListener('keydown', onKeyDown);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      desktop.removeEventListener('change', closeOnDesktop);
      previousFocus?.focus();
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (status === 'anonymous') {
      router.replace('/login');
    }
  }, [router, status]);

  const visibleNav = useMemo(
    () => navItems.filter((item) => user && item.roles.includes(user.role)),
    [user],
  );

  if (status === 'loading' || !user) {
    return (
      <main className="min-h-screen bg-surface p-6">
        <LoadingState label="Checking session..." />
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-surface">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:p-3"
      >
        Skip to content
      </a>
      <div
        id="navigation"
        ref={navigationRef}
        role={sidebarOpen ? 'dialog' : undefined}
        aria-modal={sidebarOpen ? true : undefined}
        aria-label={sidebarOpen ? 'Navigation' : undefined}
        className={`fixed inset-y-0 left-0 z-40 w-72 border-r border-border bg-white transition-transform lg:visible lg:translate-x-0 ${
          sidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-5">
          <Link
            href="/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3"
          >
            <div className="grid h-9 w-9 place-items-center rounded-md bg-brand-700 text-sm font-bold text-white">
              CT
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">ClientOps Tracker</p>
              <p className="text-xs text-muted">Operations portal</p>
            </div>
          </Link>
          <button
            aria-label="Close navigation"
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav aria-label="Main navigation" className="space-y-1 px-3 py-4">
          {visibleNav.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? 'bg-brand-50 text-brand-700'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-ink'
                }`}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                key={item.href}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {sidebarOpen ? (
        <button
          aria-label="Close navigation overlay"
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      ) : null}

      <div className="lg:pl-72" inert={sidebarOpen ? true : undefined}>
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <button
              aria-label="Open navigation"
              aria-controls="navigation"
              aria-expanded={sidebarOpen}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-ink">{user.name}</p>
              <p className="hidden text-xs text-muted sm:block">{user.email}</p>
            </div>
            <Badge value={user.role} />
          </div>
          <button
            aria-label="Logout"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            onClick={logout}
            type="button"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <main id="main-content" tabIndex={-1} className="px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function ProtectedPage({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
