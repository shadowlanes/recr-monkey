import { PAYMENT_FREQUENCIES } from '../../lib/supabase';
import { PaymentDateItem, RecurringPayment } from '../../types';

// Get all payment occurrences for a day
export const getAllPaymentDatesForDay = (payment: RecurringPayment, dayDate: Date): Date[] => {
  const paymentDates: Date[] = [];
  const startDate = new Date(payment.start_date);
  
  if (startDate.getFullYear() > dayDate.getFullYear() || 
      (startDate.getFullYear() === dayDate.getFullYear() && 
       startDate.getMonth() > dayDate.getMonth())) {
    return paymentDates;
  }
  
  switch (payment.frequency) {
    case PAYMENT_FREQUENCIES.WEEKLY: {
      const currentDate = new Date(startDate);
      while (currentDate.getFullYear() < dayDate.getFullYear() || 
             (currentDate.getFullYear() === dayDate.getFullYear() && 
              currentDate.getMonth() < dayDate.getMonth())) {
        currentDate.setDate(currentDate.getDate() + 7);
      }
      
      currentDate.setDate(currentDate.getDate() - 7);
      
      while (currentDate.getFullYear() <= dayDate.getFullYear() && 
             currentDate.getMonth() <= dayDate.getMonth()) {
        currentDate.setDate(currentDate.getDate() + 7);
        
        if (currentDate.getMonth() === dayDate.getMonth() && 
            currentDate.getFullYear() === dayDate.getFullYear() && 
            currentDate.getDate() === dayDate.getDate()) {
          paymentDates.push(new Date(currentDate));
        }
      }
      break;
    }
    
    case PAYMENT_FREQUENCIES.MONTHLY: {
      if (startDate.getDate() === dayDate.getDate()) {
        const paymentDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        if (paymentDate >= startDate) {
          paymentDates.push(paymentDate);
        }
      }
      break;
    }
    
    case PAYMENT_FREQUENCIES.FOUR_WEEKS: {
      const currentDate = new Date(startDate);
      while (currentDate.getFullYear() < dayDate.getFullYear() || 
             (currentDate.getFullYear() === dayDate.getFullYear() && 
              currentDate.getMonth() < dayDate.getMonth())) {
        currentDate.setDate(currentDate.getDate() + 28);
      }
      
      currentDate.setDate(currentDate.getDate() - 28);
      
      while (currentDate.getFullYear() <= dayDate.getFullYear() && 
             currentDate.getMonth() <= dayDate.getMonth()) {
        currentDate.setDate(currentDate.getDate() + 28);
        
        if (currentDate.getMonth() === dayDate.getMonth() && 
            currentDate.getFullYear() === dayDate.getFullYear() && 
            currentDate.getDate() === dayDate.getDate()) {
          paymentDates.push(new Date(currentDate));
        }
      }
      break;
    }
    
    case PAYMENT_FREQUENCIES.YEARLY: {
      if (startDate.getDate() === dayDate.getDate() && 
          startDate.getMonth() === dayDate.getMonth()) {
        const paymentDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        if (paymentDate >= startDate) {
          paymentDates.push(paymentDate);
        }
      }
      break;
    }
  }
  
  return paymentDates;
};

// Format frequency for display
export const formatFrequency = (frequency: string): string => {
  switch (frequency) {
    case PAYMENT_FREQUENCIES.WEEKLY:
      return 'Weekly';
    case PAYMENT_FREQUENCIES.MONTHLY:
      return 'Monthly';
    case PAYMENT_FREQUENCIES.FOUR_WEEKS:
      return 'Every 4 Weeks';
    case PAYMENT_FREQUENCIES.YEARLY:
      return 'Yearly';
    default:
      return 'Unknown';
  }
};

// Check if a date is today
export const isToday = (date: Date): boolean => {
  const today = new Date();
  return date.getDate() === today.getDate() && 
         date.getMonth() === today.getMonth() && 
         date.getFullYear() === today.getFullYear();
};

// Format currency amount
export const formatCurrency = (amount: number, currency: string): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency || 'USD'
  }).format(amount);
};




  