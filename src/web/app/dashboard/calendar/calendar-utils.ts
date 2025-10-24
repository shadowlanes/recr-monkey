import { PAYMENT_FREQUENCIES } from '../../lib/constants';
import { PaymentDateItem, RecurringPayment, PaymentSource } from '../../types';

// Get all payment occurrences for a day
export const getAllPaymentDatesForDay = (payment: RecurringPayment, dayDate: Date): Date[] => {
  const paymentDates: Date[] = [];
  
  // Parse the start date and ensure we're working in local timezone
  const startDateStr = payment.start_date;
  const [year, month, day] = startDateStr.split('-').map(Number);
  const startDate = new Date(year, month - 1, day); // month is 0-indexed
  
  // Check if the start date is after the target date
  if (startDate > dayDate) {
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
      // For monthly payments, check if the day of month matches
      const startDay = startDate.getDate();
      const targetDay = dayDate.getDate();
      
      if (startDay === targetDay) {
        const paymentDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
        
        // Ensure the payment date is on or after the start date
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

interface CalendarDay {
  date: Date | null;
  payments: PaymentDateItem[];
}

export const generateMonthCalendarData = (
  currentDate: Date,
  recurringPayments: RecurringPayment[],
  paymentSources: PaymentSource[]
): CalendarDay[] => {
  const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  const firstDayOfWeek = firstDay.getDay();
  
  const days: CalendarDay[] = [];
  
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push({ date: null, payments: [] });
  }
  
  for (let i = 1; i <= lastDay.getDate(); i++) {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
    days.push({ date, payments: [] });
  }
  
  if (recurringPayments.length > 0) {
    days.forEach(day => {
      if (!day.date) return;
      
      recurringPayments.forEach(payment => {
        const paymentDates = getAllPaymentDatesForDay(payment, day.date!);
        
        paymentDates.forEach(paymentDate => {
          const paymentSource = paymentSources.find(s => s.id === payment.payment_source_id);
          
          day.payments.push({
            date: paymentDate,
            payment,
            paymentSource
          });
        });
      });
      
      day.payments.sort((a, b) => b.payment.amount - a.payment.amount);
    });
  }
  
  return days;
};

export const generateYearCalendarData = (
  currentDate: Date,
  recurringPayments: RecurringPayment[],
  paymentSources: any[]
): CalendarDay[][] => {
  const monthsCalendar: CalendarDay[][] = [];
  
  for (let month = 0; month < 12; month++) {
    const monthDate = new Date(currentDate.getFullYear(), month, 1);
    monthsCalendar.push(generateMonthCalendarData(monthDate, recurringPayments, paymentSources));
  }
  
  return monthsCalendar;
};




