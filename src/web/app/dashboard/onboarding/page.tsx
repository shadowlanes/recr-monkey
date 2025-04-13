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
  const [hasPaymentSources, setHasPaymentSources] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  // Check if user has any payment sources 
  useEffect(() => {
    if (user) {
      const checkPaymentSources = async () => {
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
            setHasPaymentSources(paymentSourcesData && paymentSourcesData.length > 0);
            
            // If user already has payment sources, redirect to calendar
            if (paymentSourcesData && paymentSourcesData.length > 0) {
              router.push('/dashboard/calendar');
            }
          }
        } catch (error) {
          console.error('Error checking payment sources:', error);
        } finally {
          setIsLoading(false);
        }
      };
      
      checkPaymentSources();
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
      <OnboardingGuide hasPaymentSources={hasPaymentSources} showButtons={true} />
    </div>
  );
}