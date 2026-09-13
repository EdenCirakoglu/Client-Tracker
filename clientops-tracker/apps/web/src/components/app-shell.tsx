'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BriefcaseBusiness,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Rocket,
  Settings,
  Ticket,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { useApiData } from '../lib/use-api-data';
import type { UserRole } from '../lib/types';
import { titleCase } from '../lib/format';
import { LoadingState } from './ui/states';
import { ThemePicker } from './ui/preferences';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
}
const allRoles: UserRole[] = ['ADMIN', 'DEVELOPER', 'CLIENT'];
const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: BarChart3, roles: allRoles },
  { label: 'Clients', href: '/clients', icon: Building2, roles: ['ADMIN', 'DEVELOPER'] },
  { label: 'Projects', href: '/projects', icon: BriefcaseBusiness, roles: allRoles },
  { label: 'Tickets', href: '/tickets', icon: Ticket, roles: allRoles },
  { label: 'Releases', href: '/releases', icon: Rocket, roles: allRoles },
  { label: 'Accounts', href: '/users', icon: Users, roles: ['ADMIN'] },
  { label: 'My account', href: '/account', icon: Settings, roles: allRoles },
];
interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, status, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const navigationRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDetailsElement>(null);
  const scopeState = useApiData(
    () => (user?.role === 'CLIENT' ? api.clients() : Promise.resolve([])),
    [user?.role],
  );
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem('clientops:sidebar') === 'collapsed');
    } catch {
      /* Preferences are optional. */
    }
  }, []);
  useEffect(() => {
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (!accountRef.current?.open) return;
      if (event instanceof KeyboardEvent && event.key === 'Escape') {
        accountRef.current.open = false;
        accountRef.current.querySelector('summary')?.focus();
      } else if (
        event instanceof MouseEvent &&
        !accountRef.current.contains(event.target as Node)
      ) {
        accountRef.current.open = false;
      }
    };
    document.addEventListener('click', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('click', close);
      document.removeEventListener('keydown', close);
    };
  }, []);
  useEffect(() => {
    setSidebarOpen(false);
    if (accountRef.current) accountRef.current.open = false;
  }, [pathname]);
  useEffect(() => {
    if (!sidebarOpen) return;
    const navigation = navigationRef.current;
    if (!navigation) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusable = () =>
      Array.from(
        navigation.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'),
      ).filter((element) => element.getClientRects().length > 0);
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
    if (status === 'anonymous') router.replace('/login');
  }, [router, status]);
  if (status === 'loading' || !user)
    return (
      <main className="min-h-screen bg-surface p-6">
        <LoadingState label="Checking session..." />
      </main>
    );
  const activeItem = navItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const scope =
    user.role === 'CLIENT'
      ? (scopeState.data?.[0]?.name ?? 'Your organisation')
      : 'All client organisations';
  const nestedTicket = pathname.startsWith('/tickets/');
  const signOut = () => {
    setLoggingOut(true);
    setLogoutError(null);
    void logout()
      .catch(() => setLogoutError('Sign out failed. Check your connection and try again.'))
      .finally(() => setLoggingOut(false));
  };
  return (
    <div className={`min-h-screen bg-surface ${collapsed ? 'shell-collapsed' : 'shell-expanded'}`}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-panel focus:p-3"
      >
        Skip to content
      </a>
      <div
        id="navigation"
        ref={navigationRef}
        role={sidebarOpen ? 'dialog' : undefined}
        aria-modal={sidebarOpen || undefined}
        aria-label={sidebarOpen ? 'Navigation' : undefined}
        className={`shell-sidebar fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-panel transition-transform lg:visible lg:translate-x-0 ${sidebarOpen ? 'visible translate-x-0' : 'invisible -translate-x-full'}`}
      >
        <div className="flex min-h-20 shrink-0 items-center justify-between gap-2 border-b border-border px-4">
          <Link
            href="/dashboard"
            aria-label="ClientOps Tracker home"
            onClick={() => setSidebarOpen(false)}
            className="flex min-w-0 items-center gap-3"
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-action text-xs font-bold text-white">
              CT
            </span>
            <span className="nav-label text-sm font-semibold">
              ClientOps Tracker
              <span className="block text-xs font-normal text-muted">Operations portal</span>
            </span>
          </Link>
          <button
            aria-label="Close navigation"
            className="rounded-md p-2 text-muted hover:bg-slate-100 lg:hidden"
            onClick={() => setSidebarOpen(false)}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav
          aria-label="Main navigation"
          className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5"
        >
          {navItems
            .filter((item) => item.roles.includes(user.role))
            .map((item) => {
              const Icon = item.icon;
              const active = activeItem?.href === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setSidebarOpen(false)}
                  className={`nav-item flex min-h-11 items-center gap-3 rounded-md px-3 py-3 text-sm font-medium ${active ? 'bg-brand-50 text-brand-700' : 'text-muted hover:bg-slate-100 hover:text-ink'}`}
                >
                  <Icon className="h-[18px] w-[18px]" />
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-tooltip" aria-hidden="true">
                    {item.label}
                  </span>
                </Link>
              );
            })}
        </nav>
        <div className="shrink-0 border-t border-border p-3">
          <button
            type="button"
            aria-label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            aria-expanded={!collapsed}
            onClick={() => {
              const next = !collapsed;
              setCollapsed(next);
              try {
                localStorage.setItem('clientops:sidebar', next ? 'collapsed' : 'expanded');
              } catch {
                /* Storage may be blocked. */
              }
            }}
            className="nav-item hidden min-h-11 w-full items-center gap-3 rounded-md px-3 text-sm text-muted hover:bg-slate-100 lg:flex"
          >
            {collapsed ? (
              <PanelLeftOpen className="h-[18px] w-[18px]" />
            ) : (
              <PanelLeftClose className="h-[18px] w-[18px]" />
            )}
            <span className="nav-label">Collapse navigation</span>
            <span className="nav-tooltip" aria-hidden="true">
              {collapsed ? 'Expand navigation' : 'Collapse navigation'}
            </span>
          </button>
        </div>
      </div>
      {sidebarOpen ? (
        <button
          aria-label="Close navigation overlay"
          tabIndex={-1}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          type="button"
        />
      ) : null}
      <div className="shell-content" inert={sidebarOpen || undefined}>
        <header className="sticky top-0 z-20 flex min-h-20 items-center justify-between gap-3 border-b border-border bg-panel px-4 py-3 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              aria-label="Open navigation"
              aria-controls="navigation"
              aria-expanded={sidebarOpen}
              className="rounded-md p-2 text-muted hover:bg-slate-100 lg:hidden"
              onClick={() => setSidebarOpen(true)}
              type="button"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0">
              <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm font-medium">
                {nestedTicket ? (
                  <>
                    <Link
                      aria-label="Back to ticket list"
                      href="/tickets"
                      className="text-muted hover:text-brand-700"
                    >
                      <ChevronLeft className="inline h-4 w-4" /> Tickets
                    </Link>
                    <ChevronRight className="h-3 w-3 text-muted" />
                    <span>{pathname === '/tickets/new' ? 'New' : 'Detail'}</span>
                  </>
                ) : (
                  <span>{activeItem?.label ?? 'Workspace'}</span>
                )}
              </nav>
              <p className="mt-1 max-w-80 truncate text-xs text-muted" title={scope}>
                {scope}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {pathname !== '/tickets/new' ? (
              <Link
                href="/tickets/new"
                className="hidden h-10 items-center gap-2 rounded-md bg-action px-3 text-sm font-semibold text-white sm:inline-flex"
              >
                <Plus className="h-4 w-4" />
                New ticket
              </Link>
            ) : null}
            <details ref={accountRef} className="relative">
              <summary
                aria-label="Account menu"
                className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-md p-1 text-sm"
              >
                <span
                  className="grid h-9 w-9 place-items-center rounded-full bg-brand-50 font-semibold text-brand-700"
                  aria-hidden="true"
                >
                  {user.name.slice(0, 1)}
                </span>
                <span className="hidden max-w-36 truncate md:block">
                  {user.name}
                  <span className="block text-left text-xs text-muted">{titleCase(user.role)}</span>
                </span>
                <ChevronDown className="h-4 w-4 text-muted" />
              </summary>
              <div className="absolute right-0 top-full mt-3 w-64 max-w-[calc(100vw-32px)] rounded-lg border border-border bg-panel p-3 shadow-lg">
                <p className="break-words text-sm font-semibold">{user.name}</p>
                <p className="mb-3 break-all text-xs text-muted">{user.email}</p>
                <Link
                  href="/account"
                  className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-slate-100"
                >
                  <Settings className="h-4 w-4" />
                  Profile and security
                </Link>
                {user.role === 'ADMIN' ? (
                  <Link
                    href="/users"
                    className="flex min-h-11 items-center gap-2 rounded-md px-2 text-sm hover:bg-slate-100"
                  >
                    <Users className="h-4 w-4" />
                    Manage invitations
                  </Link>
                ) : null}
                <div className="my-2 border-y border-border py-2">
                  <p className="mb-1 text-xs text-muted">Appearance</p>
                  <ThemePicker />
                </div>
                <button
                  type="button"
                  disabled={loggingOut}
                  onClick={signOut}
                  className="flex min-h-11 w-full items-center gap-2 rounded-md px-2 text-sm hover:bg-slate-100"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              </div>
            </details>
            <button
              aria-label="Logout"
              title="Logout"
              className="grid h-10 w-10 place-items-center rounded-md text-muted hover:bg-slate-100 disabled:opacity-50"
              disabled={loggingOut}
              onClick={signOut}
              type="button"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main id="main-content" tabIndex={-1} className="px-4 py-6 lg:p-8">
          {logoutError ? (
            <p role="alert" className="mb-4 text-sm text-red-700">
              {logoutError}
            </p>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}
export function ProtectedPage({ children }: AppShellProps) {
  return <AppShell>{children}</AppShell>;
}
