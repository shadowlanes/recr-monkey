'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './components/auth/auth-provider';
import AuthForm from './components/auth/auth-form';
import LoadingAnimation from './components/loading-animation';

const PREVIEW_ROWS = [
  { day: '14', month: 'Nov', name: 'Spotify', amount: '₹119' },
  { day: '18', month: 'Nov', name: 'Claude Pro', amount: '$20' },
  { day: '25', month: 'Nov', name: 'Internet', amount: '₹1,180' },
  { day: '01', month: 'Dec', name: 'Rent', amount: '₹28,000' },
];

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Logged-in users belong in the dashboard
  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <LoadingAnimation size="large" />
      </div>
    );
  }

  return (
    <div className="max-w-[920px] mx-auto px-4 pb-14">
      <header className="py-5 mb-8">
        <span className="font-display font-extrabold text-[19px] tracking-tight">
          recr<span className="text-accent">·</span>monkey
        </span>
      </header>

      <div className="grid md:grid-cols-[1.15fr_1fr] gap-10 items-start">
        <section>
          <h1 className="font-display font-extrabold tracking-tight text-[clamp(32px,5.5vw,46px)] leading-[1.08] mb-4 text-balance">
            Know what your subscriptions actually cost.
          </h1>
          <p className="text-muted text-[16px] leading-relaxed mb-8 max-w-[52ch]">
            One number for your monthly spend, a 30-day view of what charges next, and every
            subscription in its own currency — rupees, dollars, dirhams, converted honestly.
          </p>

          {/* Product preview: the upcoming-charges agenda */}
          <div className="bg-surface border border-line rounded-2xl overflow-hidden max-w-md shadow-sm">
            <div className="px-4.5 py-3 border-b border-line">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                Coming up
              </p>
            </div>
            {PREVIEW_ROWS.map((row) => (
              <div
                key={`${row.day}-${row.name}`}
                className="grid grid-cols-[48px_1fr_auto] items-center gap-3.5 px-4.5 py-2.5 border-b border-line last:border-b-0"
              >
                <span className="block rounded-lg bg-accent-soft text-accent-deep text-center py-1 font-mono tnum">
                  <span className="block font-bold text-[15px] leading-tight">{row.day}</span>
                  <span className="block font-semibold text-[9px] uppercase tracking-widest">
                    {row.month}
                  </span>
                </span>
                <span className="font-semibold text-sm">{row.name}</span>
                <span className="font-mono tnum font-bold text-sm">{row.amount}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="auth-section">
          <AuthForm />
        </section>
      </div>

      <footer className="mt-16 pt-6 border-t border-line text-center text-xs text-muted">
        © {new Date().getFullYear()} recr·monkey
      </footer>
    </div>
  );
}
