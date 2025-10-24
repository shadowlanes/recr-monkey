export interface User {
  id: string;
  email: string;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  aud: string;
  created_at: string;
}

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
  payment_source_id: string;
  start_date: string;
  category: string;
  created_at: string;
}

export interface ApiResponse<T> {
  data: T | null;
  error: { message: string } | null;
}
