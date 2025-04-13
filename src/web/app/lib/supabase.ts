import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Database table names
export const TABLES = {
  PAYMENT_SOURCES: 'payment_sources',
  RECURRING_PAYMENTS: 'recurring_payments'
};

// Payment source types
export const PAYMENT_SOURCE_TYPES = {
  BANK_ACCOUNT: 'bank_account',
  DEBIT_CARD: 'debit_card',
  CREDIT_CARD: 'credit_card'
};

// Payment frequency options
export const PAYMENT_FREQUENCIES = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  FOUR_WEEKS: '4weeks',
  YEARLY: 'yearly'
};

// Supported currencies
export const SUPPORTED_CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'INR', 'AED'];

// Default display currency
export const DEFAULT_DISPLAY_CURRENCY = 'USD';

// Get display currency from localStorage
export const getDisplayCurrency = (): string => {
  if (typeof window !== 'undefined') {
    const savedCurrency = localStorage.getItem('displayCurrency');
    return savedCurrency || DEFAULT_DISPLAY_CURRENCY;
  }
  return DEFAULT_DISPLAY_CURRENCY;
};

// Save display currency to localStorage
export const saveDisplayCurrency = (currency: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('displayCurrency', currency);
  }
};

// Currency conversion utility
export interface ExchangeRates {
  rates: Record<string, number>;
  timestamp: number;
  expiry: number;
}

// Get exchange rates with 24-hour caching
export const getCurrencyRates = async (): Promise<ExchangeRates> => {
  // Check if we have cached rates in localStorage
  if (typeof window !== 'undefined') {
    const cachedRates = localStorage.getItem('currencyRates');
    if (cachedRates) {
      const parsedRates = JSON.parse(cachedRates) as ExchangeRates;
      // Check if rates are still valid (less than 24 hours old)
      if (parsedRates.expiry > Date.now()) {
        return parsedRates;
      }
    }
  }

  try {
    // Fetch new rates from public API
    // Using exchangerate-api.com as an example (replace with your preferred API)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    
    // Create rates object with 24-hour expiry
    const exchangeRates: ExchangeRates = {
      rates: data.rates,
      timestamp: Date.now(),
      expiry: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
    };
    
    // Save to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('currencyRates', JSON.stringify(exchangeRates));
    }
    
    return exchangeRates;
  } catch (error) {
    console.error('Error fetching currency rates:', error);
    
    // Return fallback rates if fetch fails
    return {
      rates: {
        USD: 1,
        EUR: 0.92,
        GBP: 0.79,
        CAD: 1.37,
        AUD: 1.51,
        JPY: 151.78,
        INR: 83.41,
        AED: 3.67
      },
      timestamp: Date.now(),
      expiry: Date.now() + 24 * 60 * 60 * 1000
    };
  }
};

// Convert amount from source currency to USD
export const convertToUSD = async (amount: number, currency: string): Promise<number> => {
  // If already in USD, return as is
  if (currency === 'USD') return amount;
  
  try {
    const rates = await getCurrencyRates();
    
    // Get the rate for the source currency
    const rate = rates.rates[currency];
    
    if (!rate) {
      console.warn(`Exchange rate not found for ${currency}, using direct value`);
      return amount;
    }
    
    // Convert to USD (rate is how many units of the currency equal 1 USD)
    return amount / rate;
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount; // Return original amount on error
  }
};

// Convert amount from one currency to another
export const convertCurrency = async (amount: number, fromCurrency: string, toCurrency: string): Promise<number> => {
  // If currencies are the same, return the original amount
  if (fromCurrency === toCurrency) return amount;
  
  try {
    const rates = await getCurrencyRates();
    
    // Get rates for both currencies
    const fromRate = rates.rates[fromCurrency];
    const toRate = rates.rates[toCurrency];
    
    if (!fromRate || !toRate) {
      console.warn(`Exchange rate not found for ${fromCurrency} or ${toCurrency}, using direct value`);
      return amount;
    }
    
    // First convert to USD, then to target currency
    // From currency to USD
    const amountInUSD = amount / fromRate;
    // USD to target currency
    return amountInUSD * toRate;
  } catch (error) {
    console.error('Error converting currency:', error);
    return amount; // Return original amount on error
  }
};

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);