'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Provider, AuthError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithSocialProvider: (provider: Provider) => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Check if user has recurring payments
  const checkForRecurringPayments = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('recurring_payments')
        .select('id')
        .eq('user_id', userId)
        .limit(1);
        
      if (error) {
        console.error('Error checking recurring payments:', error);
        return false;
      }
      
      return data && data.length > 0;
    } catch (err) {
      console.error('Error checking recurring payments:', err);
      return false;
    }
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          throw error;
        }
        if (data?.user) {
          setUser(data.user);
          
          // Check for recurring payments and redirect appropriately
          const hasRecurringPayments = await checkForRecurringPayments(data.user.id);
          if (hasRecurringPayments) {
            router.push('/dashboard/calendar');
          } else {
            // Redirect to the dedicated onboarding page
            router.push('/dashboard/onboarding');
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setUser(session.user);
          
          // On sign in or sign up, check if user has recurring payments and redirect appropriately
          if (event === 'SIGNED_IN') {
            const hasRecurringPayments = await checkForRecurringPayments(session.user.id);
            if (hasRecurringPayments) {
              router.push('/dashboard/calendar');
            } else {
              // Redirect to the dedicated onboarding page
              router.push('/dashboard/onboarding');
            }
          }
        } else {
          setUser(null);
        }
        setLoading(false);
      }
    );

    getUser();

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const signInWithSocialProvider = async (provider: Provider) => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard/onboarding`,
        },
      });
      
      if (error) {
        throw error;
      }
    } catch (error: unknown) {
      if (error instanceof AuthError) {
        setError(error.message);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      signInWithSocialProvider, 
      error 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}