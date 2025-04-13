'use client';

import { useAuth } from './components/auth/auth-provider';
import AuthForm from './components/auth/auth-form';
import { useEffect } from 'react';
import Link from 'next/link';
import Image from "next/image";

export default function Home() {
  const { user, loading, signOut } = useAuth();

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

  return (
    <div className="container mx-auto px-4 py-8">
      {!user ? (
        <div className="py-8">
          <h2 className="text-3xl font-bold text-center mb-8">
            Track Your Subscriptions and Recurring Payments
          </h2>
          <AuthForm />
        </div>
      ) : (
        <div>
          <div className="app-tabs flex border-b border-gray-200 mb-4">
            <Link href="/dashboard/payment-sources" className="app-tab-btn px-4 py-2 font-medium hover:text-indigo-600">
              Payment Sources
            </Link>
            <Link href="/dashboard/recurring-payments" className="app-tab-btn px-4 py-2 font-medium hover:text-indigo-600">
              Recurring Payments
            </Link>
            <Link href="/dashboard/calendar" className="app-tab-btn px-4 py-2 font-medium hover:text-indigo-600">
              Calendar View
            </Link>
          </div>
          
          <div className="py-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Welcome to Recr-Monkey!</h2>
            <p className="mb-4">Please select one of the tabs above to get started.</p>
          </div>
        </div>
      )}
    </div>
  );
}
