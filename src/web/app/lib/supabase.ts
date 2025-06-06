import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Database table names
export const TABLES = {
  PAYMENT_SOURCES: 'payment_sources',
  RECURRING_PAYMENTS: 'recurring_payments'
};

// Payment source types
export type PaymentSourceType = 'bank_account' | 'debit_card' | 'credit_card';

export const PAYMENT_SOURCE_TYPES: Record<string, PaymentSourceType> = {
  BANK_ACCOUNT: 'bank_account',
  DEBIT_CARD: 'debit_card',
  CREDIT_CARD: 'credit_card'
};

// Payment frequency options
export type PaymentFrequency = 'weekly' | 'monthly' | '4weeks' | 'yearly';

export const PAYMENT_FREQUENCIES: Record<string, PaymentFrequency> = {
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  FOUR_WEEKS: '4weeks',
  YEARLY: 'yearly'
};

// Supported currencies
export const SUPPORTED_CURRENCIES = ['USD', 'INR', 'AED', 'AUD', 'CAD', 'EUR', 'GBP', 'JPY'];

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
      const rates: ExchangeRates = JSON.parse(cachedRates);
      if (Date.now() < rates.expiry) {
        return rates;
      }
    }
  }

  // Fetch new rates (you can implement your preferred API here)
  // For now, return a default structure
  const rates: ExchangeRates = {
    rates: {
      USD: 1,
      EUR: 0.85,
      GBP: 0.73,
      JPY: 110,
      CAD: 1.25,
      AUD: 1.35,
      INR: 74,
      AED: 3.67
    },
    timestamp: Date.now(),
    expiry: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
  };

  // Cache the rates
  if (typeof window !== 'undefined') {
    localStorage.setItem('currencyRates', JSON.stringify(rates));
  }

  return rates;
};

// Currency symbol utility function
export const getCurrencySymbol = (currency: string): string => {
  switch (currency) {
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'CAD':
      return 'C$';
    case 'AUD':
      return 'A$';
    case 'JPY':
      return '¥';
    case 'INR':
      return '₹';
    case 'AED':
      return 'د.إ';
    default:
      return '$';
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