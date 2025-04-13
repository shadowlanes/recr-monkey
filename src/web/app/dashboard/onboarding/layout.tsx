'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '../../components/auth/auth-provider';
import { useEffect } from 'react';
import LoadingAnimation from '../../components/loading-animation';

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

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
      {children}
    </div>
  );
}