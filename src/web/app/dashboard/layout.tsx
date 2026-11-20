'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../components/auth/auth-provider';
import { DataProvider } from '../contexts/data-context';
import { SettingsProvider, useSettings } from '../contexts/settings-context';
import { PaymentDialogProvider, usePaymentDialog } from './payment-dialog';
import { DISPLAY_CURRENCIES } from '../lib/money';
import Button from '../components/ui/button';
import Logo from '../components/ui/logo';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/subscriptions', label: 'Subscriptions' },
  { href: '/dashboard/settings', label: 'Settings' },
];

function CurrencySwitch() {
  const { displayCurrency, setDisplayCurrency } = useSettings();
  return (
    <div
      className="flex rounded-full bg-surface shadow-card p-1"
      role="radiogroup"
      aria-label="Display currency"
    >
      {DISPLAY_CURRENCIES.map((currency) => (
        <button
          key={currency}
          type="button"
          role="radio"
          aria-checked={displayCurrency === currency}
          onClick={() => setDisplayCurrency(currency)}
          className={`rounded-full px-3.5 py-2 font-mono text-[13px] font-medium cursor-pointer transition-colors ${
            displayCurrency === currency ? 'bg-accent-soft text-ink' : 'text-muted hover:text-ink'
          }`}
        >
          {currency}
        </button>
      ))}
    </div>
  );
}

function AccountMenu() {
  const { user, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  if (!user) return null;
  const initial = (user.name || user.email || '?').charAt(0).toUpperCase();

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account"
        className="w-11 h-11 rounded-full bg-cat-entertainment-soft text-cat-entertainment-ink font-bold text-[15px] cursor-pointer hover:opacity-85 transition-opacity"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-13 z-40 min-w-56 bg-surface rounded-[20px] shadow-float p-2"
        >
          <p className="px-3 py-2 text-xs text-muted truncate">{user.email}</p>
          <button
            role="menuitem"
            onClick={signOut}
            className="w-full text-left px-3 py-2 rounded-xl text-sm font-semibold text-ink hover:bg-hover cursor-pointer"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { openAdd } = usePaymentDialog();

  return (
    <div className="max-w-[1120px] mx-auto px-4 sm:px-6 pb-16">
      <header className="flex items-center gap-x-6 gap-y-4 flex-wrap py-5 mb-2">
        <Link href="/dashboard" aria-label="recr monkey — Overview">
          <Logo />
        </Link>

        <nav
          aria-label="Main"
          className="flex gap-1 bg-surface shadow-card p-[5px] rounded-full order-3 sm:order-none max-sm:w-full max-sm:justify-between"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? 'page' : undefined}
              className={`rounded-full px-4.5 py-2 text-sm font-semibold transition-colors max-sm:flex-1 max-sm:text-center max-sm:px-2 ${
                pathname === item.href ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2.5 ml-auto">
          <CurrencySwitch />
          <Button onClick={openAdd}>
            <svg aria-hidden width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add
          </Button>
          <AccountMenu />
        </div>
      </header>

      {children}
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  if (!user) {
    return null;
  }

  return (
    <DataProvider>
      <SettingsProvider>
        <PaymentDialogProvider>
          <DashboardShell>{children}</DashboardShell>
        </PaymentDialogProvider>
      </SettingsProvider>
    </DataProvider>
  );
}
