'use client';

import { useAuth } from '../components/auth/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, TABLES } from '../lib/supabase';
import OnboardingGuide from '../components/onboarding-guide';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasPaymentSources, setHasPaymentSources] = useState<boolean>(true);
  const [hasRecurringPayments, setHasRecurringPayments] = useState<boolean>(true);
  const [isLoadingPaymentSources, setIsLoadingPaymentSources] = useState<boolean>(true);
  const [isLoadingRecurringPayments, setIsLoadingRecurringPayments] = useState<boolean>(true);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  // Check if user has any payment sources and recurring payments
  useEffect(() => {
    if (user) {
      const checkUserData = async () => {
        try {
          setIsLoadingPaymentSources(true);
          setIsLoadingRecurringPayments(true);
          
          // Check payment sources
          const { data: paymentSourcesData, error: paymentSourcesError } = await supabase
            .from(TABLES.PAYMENT_SOURCES)
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
            
          if (paymentSourcesError) {
            console.error('Error checking payment sources:', paymentSourcesError.message);
          } else {
            setHasPaymentSources(paymentSourcesData && paymentSourcesData.length > 0);
          }
          
          // Check recurring payments
          const { data: recurringPaymentsData, error: recurringPaymentsError } = await supabase
            .from(TABLES.RECURRING_PAYMENTS)
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
            
          if (recurringPaymentsError) {
            console.error('Error checking recurring payments:', recurringPaymentsError.message);
          } else {
            setHasRecurringPayments(recurringPaymentsData && recurringPaymentsData.length > 0);
          }
        } catch (error: any) {
          console.error('Error checking user data:', error.message);
        } finally {
          setIsLoadingPaymentSources(false);
          setIsLoadingRecurringPayments(false);
        }
      };
      
      checkUserData();
    }
  }, [user]);

  // Redirect to payment sources page if user doesn't have recurring payments configured
  // and they're trying to access other tabs
  useEffect(() => {
    if (!isLoadingRecurringPayments && !hasRecurringPayments && user) {
      const isAttemptingToAccessOtherTab = 
        pathname && 
        pathname !== '/dashboard/payment-sources' && 
        !pathname.includes('/dashboard/payment-sources');
      
      if (isAttemptingToAccessOtherTab) {
        router.push('/dashboard/payment-sources');
      }
    }
  }, [pathname, hasRecurringPayments, isLoadingRecurringPayments, user, router]);

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

  if (loading || isLoadingPaymentSources) {
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
          className={`app-tab-btn px-4 py-2 font-medium ${!hasRecurringPayments ? 'text-gray-400 cursor-not-allowed' : pathname?.includes('/recurring-payments') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
          onClick={(e) => !hasRecurringPayments && e.preventDefault()}
        >
          Recurring Payments
        </Link>
        <Link 
          href="/dashboard/calendar" 
          className={`app-tab-btn px-4 py-2 font-medium ${!hasRecurringPayments ? 'text-gray-400 cursor-not-allowed' : pathname?.includes('/calendar') ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-indigo-600'}`}
          onClick={(e) => !hasRecurringPayments && e.preventDefault()}
        >
          Calendar View
        </Link>
      </div>
      
      {!hasPaymentSources ? (
        <OnboardingGuide hasPaymentSources={hasPaymentSources} />
      ) : (
        children
      )}
    </div>
  );
}