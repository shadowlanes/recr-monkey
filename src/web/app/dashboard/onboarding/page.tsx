'use client';

import React from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase, TABLES } from '../../lib/supabase';
import OnboardingGuide from '../../components/onboarding-guide';

export default function OnboardingPage() { 
  const { user, loading } = useAuth();
  const router = useRouter();
  const [hasPaymentSources, setHasPaymentSources] = useState<boolean>(false);
  const [hasRecurringPayments, setHasRecurringPayments] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
          setIsLoading(true);
          
          // Check payment sources
          const { data: paymentSourcesData, error: paymentSourcesError } = await supabase
            .from(TABLES.PAYMENT_SOURCES)
            .select('id')
            .eq('user_id', user.id)
            .limit(1);
            
          if (paymentSourcesError) {
            console.error('Error checking payment sources:', paymentSourcesError.message);
          } else {
            const hasPaymentSrc = paymentSourcesData && paymentSourcesData.length > 0;
            setHasPaymentSources(hasPaymentSrc);
            
            // Check for recurring payments
            const { data: recurringPaymentsData, error: recurringPaymentsError } = await supabase
              .from(TABLES.RECURRING_PAYMENTS)
              .select('id')
              .eq('user_id', user.id)
              .limit(1);
              
            if (recurringPaymentsError) {
              console.error('Error checking recurring payments:', recurringPaymentsError.message);
            } else {
              const hasRecurringPmts = recurringPaymentsData && recurringPaymentsData.length > 0;
              setHasRecurringPayments(hasRecurringPmts);
              
              // If user has both payment sources and recurring payments, redirect to calendar
              if (hasPaymentSrc && hasRecurringPmts) {
                router.push('/dashboard/calendar');
              }
            }
          }
        } catch (error) {
          console.error('Error checking user data:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      checkUserData();
    }
  }, [user, router]);

  if (loading || isLoading) {
    return <div className="flex justify-center py-12">Loading...</div>;
  }

  if (!user) {
    return null; // Will redirect in the useEffect
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <OnboardingGuide 
        hasPaymentSources={hasPaymentSources} 
        hasRecurringPayments={hasRecurringPayments}
        showButtons={true} 
      />
    </div>
  );
}