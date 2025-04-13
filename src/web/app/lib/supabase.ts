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

// Create a single supabase client for the entire app
export const supabase = createClient(supabaseUrl, supabaseAnonKey);