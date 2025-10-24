'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { api, User } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
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
      const response = await fetch(`${API_URL}/api/recurring-payments/check`);
      const result = await response.json();
      
      if (result.error) {
        console.error('Error checking recurring payments:', result.error);
        return false;
      }
      
      return result.data && result.data.length > 0;
    } catch (err) {
      console.error('Error checking recurring payments:', err);
      return false;
    }
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const currentUser = await api.getUser();
        if (currentUser && !userRef.current) {
          setUser(currentUser);
          userRef.current = currentUser;
        }
      } catch (error) {
        console.error('Error fetching user:', error);
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [router]);

  const signOut = async () => {
    try {
      await api.signOut();
      setUser(null);
      userRef.current = null;
      router.push('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setError(null);
    try {
      const { user: loggedInUser } = await api.signIn(email, password);
      setUser(loggedInUser);
      userRef.current = loggedInUser;
      
      // Check for recurring payments and redirect
      const hasRecurringPayments = await checkForRecurringPayments(loggedInUser.id);
      if (hasRecurringPayments) {
        router.push('/dashboard/calendar');
      } else {
        router.push('/dashboard/onboarding');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
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
      const { user: newUser } = await api.signUp(email, password);
      setUser(newUser);
      userRef.current = newUser;
      
      // New users go to onboarding
      router.push('/dashboard/onboarding');
    } catch (error: unknown) {
      if (error instanceof Error) {
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