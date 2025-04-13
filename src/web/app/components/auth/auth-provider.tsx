'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { User, Provider } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
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
          
          // Check for recurring payments and redirect if needed
          const hasRecurringPayments = await checkForRecurringPayments(data.user.id);
          if (hasRecurringPayments) {
            router.push('/dashboard/calendar');
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
          
          // On sign in or sign up, check if user has recurring payments and redirect
          if (event === 'SIGNED_IN' || event === 'SIGNED_UP') {
            const hasRecurringPayments = await checkForRecurringPayments(session.user.id);
            if (hasRecurringPayments) {
              router.push('/dashboard/calendar');
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

  const signUp = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signIn = async (email: string, password: string) => {
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  // New method for passwordless login with magic link
  const sendMagicLink = async (email: string) => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  // New method for social login
  const signInWithSocialProvider = async (provider: Provider) => {
    setError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
        },
      });
      
      if (error) {
        throw error;
      }
    } catch (error: any) {
      setError(error.message);
      throw error;
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      signUp, 
      signIn, 
      signOut, 
      sendMagicLink, 
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