'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Provider, AuthError } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  signInWithSocialProvider: (provider: Provider) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const userRef = useRef<User | null>(null);

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
          // Only set user if it's not already set (login event)
          if (!userRef.current) {
            setUser(data.user);
            userRef.current = data.user;
            const hasRecurringPayments = await checkForRecurringPayments(data.user.id);
            if (hasRecurringPayments) {
              router.push('/dashboard/calendar');
            } else {
              router.push('/dashboard/onboarding');
            }
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
        console.log('Auth state change event:', event);
        // Only update on actual login
        if (event === 'SIGNED_IN' && session?.user && !userRef.current) {
          console.log('User Set since userRef check failed:', event);
          setUser(session.user);
          userRef.current = session.user;
          console.log('Received Event:', event);
          const hasRecurringPayments = await checkForRecurringPayments(session.user.id);
          if (hasRecurringPayments) {
            router.push('/dashboard/calendar');
          } else {
            router.push('/dashboard/onboarding');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          userRef.current = null;
        }
        // Ignore other events (like TOKEN_REFRESHED) to avoid redundant state updates
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

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
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

  const signUpWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard/onboarding`,
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

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signOut, 
      signInWithSocialProvider,
      signInWithEmail,
      signUpWithEmail,
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