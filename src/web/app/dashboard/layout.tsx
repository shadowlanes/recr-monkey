'use client';

import { useAuth } from '../components/auth/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase, TABLES } from '../lib/supabase';
import LoadingAnimation from '../components/loading-animation';
import CurrencySelector from '../components/currency-selector';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRecurringPayments, setHasRecurringPayments] = useState<boolean>(true);
  const [isLoadingRecurringPayments, setIsLoadingRecurringPayments] = useState<boolean>(true);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  // Check if user has recurring payments
  useEffect(() => {
    if (user) {
      const checkUserData = async () => {
        try {
          setIsLoadingRecurringPayments(true);
          
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
          setIsLoadingRecurringPayments(false);
        }
      };
      
      checkUserData();
    }
  }, [user]);

  // Add currency selector and signout handler to navigation when user is logged in
  useEffect(() => {
    const navElement = document.getElementById('main-nav');
    if (navElement && user) {
      // Create a container for the header controls
      navElement.innerHTML = `
        <div class="header-controls flex items-center space-x-3">
          <div id="currency-selector-container"></div>
          <button id="logout-btn" class="btn btn-small btn-secondary">Logout</button>
        </div>
      `;
      
      // Add logout event listener
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
      }
      
      // Render the currency selector component
      const currencySelectorContainer = document.getElementById('currency-selector-container');
      if (currencySelectorContainer && typeof window !== 'undefined') {
        // Use a temporary div to render the component
        const tempDiv = document.createElement('div');
        tempDiv.className = 'flex items-center';
        currencySelectorContainer.appendChild(tempDiv);
        
        // Add a label for the selector
        const label = document.createElement('span');
        label.className = 'text-sm text-gray-600 mr-2';
        label.textContent = 'Currency:';
        tempDiv.appendChild(label);
        
        // Create a container for the CurrencySelector
        const selectorContainer = document.createElement('div');
        selectorContainer.id = 'currency-selector-mount';
        tempDiv.appendChild(selectorContainer);
      }
    } else if (navElement) {
      navElement.innerHTML = '';
    }
  }, [user, signOut]);

  // Add the currency selector to the DOM after component mount
  useEffect(() => {
    // Find the currency selector mount point
    const mountPoint = document.getElementById('currency-selector-mount');
    if (mountPoint && typeof window !== 'undefined' && user) {
      // Use React's createRoot to render the CurrencySelector component
      const ReactDOM = require('react-dom/client');
      const root = ReactDOM.createRoot(mountPoint);
      root.render(<CurrencySelector />);
    }
  }, [user]);

  if (loading || isLoadingRecurringPayments) {
    return (
      <div className="flex justify-center py-12">
        <LoadingAnimation size="large" />
      </div>
    );
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