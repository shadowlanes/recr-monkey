export interface PaymentSource {
  id: string;
  user_id: string;
  name: string;
  type: 'bank_account' | 'debit_card' | 'credit_card';
  identifier: string;
  created_at: string;
}

export interface RecurringPayment {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | '4weeks' | 'yearly';
  payment_source_id: string | null;
  start_date: string;
  category: string | null;
  created_via: 'web' | 'api' | 'mcp';
  created_at: string;
}

export interface UserPreferences {
  user_id: string;
  display_currency: string;
  updated_at?: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
}
