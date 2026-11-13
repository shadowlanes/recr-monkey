import { Frequency } from '../lib/money';

// Types for payment sources
export interface PaymentSource {
  id: string;
  user_id: string;
  name: string;
  type: 'bank_account' | 'debit_card' | 'credit_card';
  identifier: string;
  created_at?: string;
}

// Types for recurring payments.
// payment_source_id and category are optional metadata.
export interface RecurringPayment {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: Frequency;
  payment_source_id: string | null;
  start_date: string;
  category: string | null;
  created_at?: string;
}
