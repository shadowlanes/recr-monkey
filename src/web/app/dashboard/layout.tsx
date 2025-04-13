'use client';

import { useAuth } from '../components/auth/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  // Add signout handler to navigation when user is logged in
  useEffect(() => {
    const navElement = document.getElementById('main-nav');
    if (navElement && user) {
      navElement.innerHTML = `
        <button id="logout-btn" class="btn btn-small btn-secondary">Logout</button>
      `;
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
      }
    } else if (navElement) {
      navElement.innerHTML = '';
    }
  }, [user, signOut]);

  if (loading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="app-tabs flex border-b border-gray-200 mb-4">
        <Link 
          href="/dashboard/payment-sources" 
          className={`app-tab-btn px-4 py-2 font-medium ${pathname?.includes('/payment-sources') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
        >
          Payment Sources
        </Link>
        <Link 
          href="/dashboard/recurring-payments" 
          className={`app-tab-btn px-4 py-2 font-medium ${pathname?.includes('/recurring-payments') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
        >
          Recurring Payments
        </Link>
        <Link 
          href="/dashboard/calendar" 
          className={`app-tab-btn px-4 py-2 font-medium ${pathname?.includes('/calendar') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
        >
          Calendar View
        </Link>
      </div>
      
      {children}
    </div>
  );
}