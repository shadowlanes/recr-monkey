'use client';

import { createContext, useContext, useEffect, useState, useRef } from 'react';
import { api, User } from '../../lib/api-client';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // stayOnPage: keep the current page (and its query) after signing in,
  // instead of going to the dashboard. Used by the OAuth consent page.
  signInWithEmail: (email: string, password: string, stayOnPage?: boolean) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name?: string,
    stayOnPage?: boolean,
  ) => Promise<void>;
  signInWithGoogle: (stayOnPage?: boolean) => Promise<void>;
  error: string | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const userRef = useRef<User | null>(null);

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

  const signInWithEmail = async (email: string, password: string, stayOnPage = false) => {
    setError(null);
    try {
      const { user: loggedInUser } = await api.signIn(email, password);
      setUser(loggedInUser);
      userRef.current = loggedInUser;
      if (!stayOnPage) router.push('/dashboard');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
      throw error;
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name?: string,
    stayOnPage = false,
  ) => {
    setError(null);
    try {
      const { user: newUser } = await api.signUp(email, password, name);
      setUser(newUser);
      userRef.current = newUser;
      if (!stayOnPage) router.push('/dashboard');
    } catch (error: unknown) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('An unknown error occurred');
      }
      throw error;
    }
  };

  const signInWithGoogle = async (stayOnPage = false) => {
    setError(null);
    try {
      const callbackURL = stayOnPage
        ? window.location.href
        : `${window.location.origin}/dashboard`;
      const url = await api.signInWithGoogle(callbackURL);
      window.location.href = url;
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Google sign-in failed');
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
      signInWithGoogle,
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