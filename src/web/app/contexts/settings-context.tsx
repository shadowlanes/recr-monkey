'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api-client';
import { Rates } from '../lib/money';
import { useAuth } from '../components/auth/auth-provider';

interface SettingsContextType {
  /** USD-based exchange rates; null until loaded */
  rates: Rates | null;
  displayCurrency: string;
  setDisplayCurrency: (currency: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const CURRENCY_CACHE_KEY = 'displayCurrency';

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [rates, setRates] = useState<Rates | null>(null);
  const [displayCurrency, setDisplayCurrencyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(CURRENCY_CACHE_KEY) || 'USD';
    }
    return 'USD';
  });

  // Load exchange rates once
  useEffect(() => {
    let cancelled = false;
    api
      .getRates()
      .then((data) => {
        if (!cancelled) setRates(data);
      })
      .catch((error) => console.error('Failed to load exchange rates:', error));
    return () => {
      cancelled = true;
    };
  }, []);

  // Load the user's saved display currency
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    api
      .getPreferences()
      .then((prefs) => {
        if (!cancelled && prefs.display_currency) {
          setDisplayCurrencyState(prefs.display_currency);
          try {
            localStorage.setItem(CURRENCY_CACHE_KEY, prefs.display_currency);
          } catch {}
        }
      })
      .catch((error) => console.error('Failed to load preferences:', error));
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Optimistic update; the server write follows
  const setDisplayCurrency = useCallback(
    (currency: string) => {
      setDisplayCurrencyState(currency);
      try {
        localStorage.setItem(CURRENCY_CACHE_KEY, currency);
      } catch {}
      if (user) {
        api
          .updatePreferences({ display_currency: currency })
          .catch((error) => console.error('Failed to save display currency:', error));
      }
    },
    [user],
  );

  return (
    <SettingsContext.Provider value={{ rates, displayCurrency, setDisplayCurrency }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
