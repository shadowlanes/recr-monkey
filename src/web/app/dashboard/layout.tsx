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

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/dashboard/subscriptions', label: 'Subscriptions' },
  { href: '/dashboard/settings', label: 'Settings' },
];

function CurrencySwitch() {
  const { displayCurrency, setDisplayCurrency } = useSettings();
  return (
    <div
      className="flex rounded-full border border-line bg-surface p-[3px]"
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
          className={`rounded-full px-3 py-1 font-mono text-xs font-semibold cursor-pointer transition-colors ${
            displayCurrency === currency ? 'bg-accent text-white' : 'text-muted hover:text-ink'
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
        className="w-9 h-9 rounded-full bg-ink text-bg font-display font-bold text-sm cursor-pointer hover:opacity-85 transition-opacity"
      >
        {initial}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-40 min-w-56 bg-surface border border-line rounded-xl shadow-xl p-2"
        >
          <p className="px-3 py-2 text-xs text-muted truncate">{user.email}</p>
          <button
            role="menuitem"
            onClick={signOut}
            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold text-ink hover:bg-accent-soft cursor-pointer"
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
    <div className="max-w-[920px] mx-auto px-4 pb-14">
      <header className="flex items-center gap-3.5 flex-wrap py-5 mb-5">
        <Link
          href="/dashboard"
          className="font-display font-extrabold text-[19px] tracking-tight whitespace-nowrap"
        >
          recr<span className="text-accent">·</span>monkey
        </Link>

        <nav className="flex gap-1 flex-1 order-3 basis-full sm:order-none sm:basis-auto">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                pathname === item.href ? 'bg-ink text-bg' : 'text-muted hover:text-ink'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <CurrencySwitch />
        <Button onClick={openAdd}>+ Add</Button>
        <AccountMenu />
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
