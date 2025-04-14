// Types for payment sources
export interface PaymentSource {
  id: string;
  user_id: string;
  name: string;
  type: 'bank_account' | 'debit_card' | 'credit_card';
  identifier: string;
  created_at?: string;
}

// Types for recurring payments
export interface RecurringPayment {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  currency: string;
  frequency: 'weekly' | 'monthly' | '4weeks' | 'yearly';
  payment_source_id: string;
  start_date: string;
  category: string; // Add new category field
  created_at?: string;
}

// Type for payment dates with reference to payment and source
export interface PaymentDateItem {
  date: Date;
  payment: RecurringPayment;
  paymentSource?: PaymentSource;
}