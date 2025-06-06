'use client';

import { useEffect, useRef } from 'react';
import { useAuth } from '../components/auth/auth-provider';
import { useRouter, usePathname } from 'next/navigation';
import { DataProvider } from '../contexts/data-context';
import ReactDOM from 'react-dom/client';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const reactRootRef = useRef<any>(null);

  useEffect(() => {
    if (!user) {
      router.push('/');
      return;
    }
  }, [user, router]);

  // Check user data and handle any initialization
  useEffect(() => {
    const checkUserData = async () => {
      if (!user) return;
      
      try {
        // Any user data checks can go here
        console.log('User data check completed');
      } catch (error: any) {
        console.error('Error checking user data:', error.message);
      }
    };

    if (user) {
      checkUserData();
    }
  }, [user]);

  // Handle header navigation
  useEffect(() => {
    const navElement = document.getElementById('header-nav');
    
    if (navElement && user) {
      navElement.innerHTML = `
        <div class="header-controls flex items-center space-x-3">
          <button id="logout-btn" class="btn btn-small btn-secondary">Logout</button>
        </div>
      `;
      
      // Add logout event listener
      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', signOut);
      }
    } else if (navElement) {
      navElement.innerHTML = '';
    }
  }, [user, signOut]);

  // Cleanup function to unmount any React roots
  useEffect(() => {
    return () => {
      if (reactRootRef.current) {
        reactRootRef.current.unmount();
        reactRootRef.current = null;
      }
    };
  }, []);

  // Navigation handler
  const handleNavigation = (path: string) => {
    router.push(path);
  };

  // Determine active tab
  const isActiveTab = (path: string) => {
    return pathname === path;
  };

  if (!user) {
    return null;
  }

  return (
    <DataProvider>
      <div className="container mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="app-tabs flex border-b border-gray-200 mb-6">
          <button
            onClick={() => handleNavigation('/dashboard/payment-sources')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              isActiveTab('/dashboard/payment-sources')
                ? 'text-[#e06c00] border-[#e06c00]'
                : 'text-[#4e5c6f] border-transparent hover:text-[#303030]'
            }`}
          >
            Payment Sources
          </button>
          <button
            onClick={() => handleNavigation('/dashboard/recurring-payments')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              isActiveTab('/dashboard/recurring-payments')
                ? 'text-[#e06c00] border-[#e06c00]'
                : 'text-[#4e5c6f] border-transparent hover:text-[#303030]'
            }`}
          >
            Recurring Payments
          </button>
          <button
            onClick={() => handleNavigation('/dashboard/calendar')}
            className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
              isActiveTab('/dashboard/calendar')
                ? 'text-[#e06c00] border-[#e06c00]'
                : 'text-[#4e5c6f] border-transparent hover:text-[#303030]'
            }`}
          >
            Calendar View
          </button>
        </div>

        {/* Page Content */}
        {children}
      </div>
    </DataProvider>
  );
}