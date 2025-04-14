'use client';

import React from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useData } from '../../contexts/data-context';
import OnboardingGuide from '../../components/onboarding-guide';
import LoadingAnimation from '../../components/loading-animation';

export default function OnboardingPage() { 
  const { user, loading } = useAuth();
  const router = useRouter();
  const { paymentSources, recurringPayments, isLoading: dataLoading } = useData();
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  // Check if user has any payment sources and recurring payments
  useEffect(() => {
    if (user && !dataLoading) {
      try {
        const hasPaymentSrc = paymentSources.length > 0;
        const hasRecurringPmts = recurringPayments.length > 0;
        
        // If user has both payment sources and recurring payments, redirect to calendar
        if (hasPaymentSrc && hasRecurringPmts) {
          router.push('/dashboard/calendar');
        }
      } catch (error) {
        console.error('Error checking user data:', error);
      } finally {
        setIsLoading(false);
      }
    }
  }, [user, router, paymentSources, recurringPayments, dataLoading]);

  if (loading || dataLoading || isLoading) {
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
      <OnboardingGuide 
        hasPaymentSources={paymentSources.length > 0} 
        hasRecurringPayments={recurringPayments.length > 0}
        showButtons={true} 
      />
    </div>
  );
}