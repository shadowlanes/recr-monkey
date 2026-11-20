'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './components/auth/auth-provider';
import AuthForm from './components/auth/auth-form';
import Logo from './components/ui/logo';
import { categoryInk, categorySoft } from './lib/categories';
import LoadingAnimation from './components/loading-animation';

const PREVIEW_ROWS = [
  { day: '14', month: 'Nov', name: 'Spotify', amount: '₹119', category: 'Entertainment' },
  { day: '18', month: 'Nov', name: 'Claude Pro', amount: '$20', category: 'Subscription' },
  { day: '25', month: 'Nov', name: 'Internet', amount: '₹1,180', category: 'Utilities' },
  { day: '01', month: 'Dec', name: 'Rent', amount: '₹28,000', category: 'Housing' },
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
    <div className="max-w-[1040px] mx-auto px-4 sm:px-6 pb-14">
      <header className="py-5 mb-8">
        <Logo />
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
          <div className="card p-2 max-w-md">
            <p className="font-display font-bold text-[15px] px-3.5 pt-3 pb-1.5">Coming up</p>
            {PREVIEW_ROWS.map((row) => (
              <div
                key={`${row.day}-${row.name}`}
                className="grid grid-cols-[48px_1fr_auto] items-center gap-3.5 px-3.5 py-2"
              >
                <span
                  className="flex flex-col items-center justify-center w-12 h-12 rounded-[16px] leading-none font-mono tnum"
                  style={{ background: categorySoft(row.category), color: categoryInk(row.category) }}
                >
                  <span className="block font-medium text-[17px]">{row.day}</span>
                  <span className="block font-sans font-bold text-[9px] uppercase tracking-widest mt-[3px]">
                    {row.month}
                  </span>
                </span>
                <span className="font-semibold text-sm">{row.name}</span>
                <span className="font-mono tnum font-medium text-sm">{row.amount}</span>
              </div>
            ))}
          </div>
        </section>

        <section id="auth-section">
          <AuthForm />
        </section>
      </div>

      <footer className="mt-16 pt-6 border-t border-line text-center text-xs text-muted">
        © {new Date().getFullYear()} recr monkey
      </footer>
    </div>
  );
}
