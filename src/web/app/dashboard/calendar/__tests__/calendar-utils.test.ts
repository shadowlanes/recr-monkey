import { 
  getAllPaymentDatesForDay, 
  formatFrequency, 
  isToday, 
  formatCurrency, 
  generateMonthCalendarData 
} from '../calendar-utils';
import { RecurringPayment, PaymentSource } from '../../../types';

// Mock the PAYMENT_FREQUENCIES constant
jest.mock('../../../lib/supabase', () => ({
  PAYMENT_FREQUENCIES: {
    WEEKLY: 'weekly',
    MONTHLY: 'monthly',
    FOUR_WEEKS: '4weeks',
    YEARLY: 'yearly'
  }
}));

describe('calendar-utils', () => {
  describe('formatFrequency', () => {
    it('should format weekly frequency correctly', () => {
      expect(formatFrequency('weekly')).toBe('Weekly');
    });

    it('should format monthly frequency correctly', () => {
      expect(formatFrequency('monthly')).toBe('Monthly');
    });

    it('should format four weeks frequency correctly', () => {
      expect(formatFrequency('4weeks')).toBe('Every 4 Weeks');
    });

    it('should format yearly frequency correctly', () => {
      expect(formatFrequency('yearly')).toBe('Yearly');
    });

    it('should return Unknown for invalid frequency', () => {
      expect(formatFrequency('invalid')).toBe('Unknown');
    });
  });

  describe('isToday', () => {
    it('should return true for today\'s date', () => {
      const today = new Date();
      expect(isToday(today)).toBe(true);
    });

    it('should return false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it('should return false for tomorrow', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency correctly', () => {
      expect(formatCurrency(100, 'USD')).toBe('$100.00');
    });

    it('should format EUR currency correctly', () => {
      expect(formatCurrency(50.5, 'EUR')).toBe('€50.50');
    });

    it('should handle missing currency by defaulting to USD', () => {
      expect(formatCurrency(25, '')).toBe('$25.00');
    });

    it('should handle large amounts', () => {
      expect(formatCurrency(1234567.89, 'USD')).toBe('$1,234,567.89');
    });
  });

  describe('getAllPaymentDatesForDay', () => {
    const mockPayment: RecurringPayment = {
      id: '1',
      user_id: 'user1',
      name: 'Test Payment',
      amount: 100,
      currency: 'USD',
      frequency: 'monthly',
      payment_source_id: 'source1',
      start_date: '2024-01-15',
      category: 'utilities'
    };

    it('should return empty array if start date is after target date', () => {
      const futurePayment = { ...mockPayment, start_date: '2025-12-01' };
      const targetDate = new Date(2024, 0, 15);
      
      const result = getAllPaymentDatesForDay(futurePayment, targetDate);
      expect(result).toEqual([]);
    });

    it('should find monthly payment on correct day', () => {
      const targetDate = new Date(2024, 5, 15); // June 15, 2024
      
      const result = getAllPaymentDatesForDay(mockPayment, targetDate);
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(5);
      expect(result[0].getFullYear()).toBe(2024);
    });

    it('should not find monthly payment on wrong day', () => {
      const targetDate = new Date(2024, 5, 16); // June 16, 2024
      
      const result = getAllPaymentDatesForDay(mockPayment, targetDate);
      expect(result).toEqual([]);
    });

    it('should find yearly payment on correct day and month', () => {
      const yearlyPayment = { ...mockPayment, frequency: 'yearly' as const };
      const targetDate = new Date(2025, 0, 15); // January 15, 2025
      
      const result = getAllPaymentDatesForDay(yearlyPayment, targetDate);
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(0);
      expect(result[0].getFullYear()).toBe(2025);
    });

    it('should not find yearly payment on wrong month', () => {
      const yearlyPayment = { ...mockPayment, frequency: 'yearly' as const };
      const targetDate = new Date(2025, 1, 15); // February 15, 2025
      
      const result = getAllPaymentDatesForDay(yearlyPayment, targetDate);
      expect(result).toEqual([]);
    });
    
    it('should find payment for June 15th 2025 directly', () => {
      const paymentStartingJune15: RecurringPayment = {
        id: '2',
        user_id: 'user1',
        name: 'Monthly Subscription',
        amount: 50,
        currency: 'USD',
        frequency: 'monthly',
        payment_source_id: 'source1',
        start_date: '2025-06-15', // June 15th, 2025
        category: 'subscription'
      };
      
      const june15Date = new Date(2025, 5, 15); // June 15th, 2025
      
      const result = getAllPaymentDatesForDay(paymentStartingJune15, june15Date);
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(5);
      expect(result[0].getFullYear()).toBe(2025);
    });
    
    it('should include recurring payment for WEEKLY frequency starting June 15th, 2025', () => {
      const weeklyPayment: RecurringPayment = {
        id: '3',
        user_id: 'user1',
        name: 'Weekly Subscription',
        amount: 25,
        currency: 'USD',
        frequency: 'weekly',
        payment_source_id: 'source1',
        start_date: '2025-06-15', // Sunday, June 15th, 2025
        category: 'subscription'
      };
      
      const june15Date = new Date(2025, 5, 15); // June 15th, 2025
      
      const result = getAllPaymentDatesForDay(weeklyPayment, june15Date);
      
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(5);
      expect(result[0].getFullYear()).toBe(2025);
    });

    it('should include recurring payment for 4WEEKS frequency starting June 15th, 2025', () => {
      const fourWeeksPayment: RecurringPayment = {
        id: '4',
        user_id: 'user1',
        name: 'Every 4 Weeks Payment',
        amount: 100,
        currency: 'USD',
        frequency: '4weeks',
        payment_source_id: 'source1',
        start_date: '2025-06-15', // June 15th, 2025
        category: 'utilities'
      };
      
      const june15Date = new Date(2025, 5, 15); // June 15th, 2025
      
      const result = getAllPaymentDatesForDay(fourWeeksPayment, june15Date);
      
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(5);
      expect(result[0].getFullYear()).toBe(2025);
    });

    it('should include recurring payment for YEARLY frequency starting June 15th, 2025', () => {
      const yearlyPayment: RecurringPayment = {
        id: '5',
        user_id: 'user1',
        name: 'Annual Payment',
        amount: 1200,
        currency: 'USD',
        frequency: 'yearly',
        payment_source_id: 'source1',
        start_date: '2025-06-15', // June 15th, 2025
        category: 'insurance'
      };
      
      const june15Date = new Date(2025, 5, 15); // June 15th, 2025
      
      const result = getAllPaymentDatesForDay(yearlyPayment, june15Date);
      
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(5);
      expect(result[0].getFullYear()).toBe(2025);
    });

    it('should include WEEKLY payment in future weeks', () => {
      const weeklyPayment: RecurringPayment = {
        id: '6',
        user_id: 'user1',
        name: 'Weekly Payment',
        amount: 30,
        currency: 'USD',
        frequency: 'weekly',
        payment_source_id: 'source1',
        start_date: '2025-06-15', // Sunday, June 15th, 2025
        category: 'subscription'
      };
      
      // Check if payment appears on June 22nd (one week later)
      const june22Date = new Date(2025, 5, 22); // June 22nd, 2025
      
      const result = getAllPaymentDatesForDay(weeklyPayment, june22Date);
      
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(22);
      expect(result[0].getMonth()).toBe(5);
      expect(result[0].getFullYear()).toBe(2025);
    });

    it('should include 4WEEKS payment after 28 days', () => {
      const fourWeeksPayment: RecurringPayment = {
        id: '7',
        user_id: 'user1',
        name: 'Every 4 Weeks Payment',
        amount: 150,
        currency: 'USD',
        frequency: '4weeks',
        payment_source_id: 'source1',
        start_date: '2025-06-15', // June 15th, 2025
        category: 'utilities'
      };
      
      // Check if payment appears on July 13th (28 days later)
      const july13Date = new Date(2025, 6, 13); // July 13th, 2025
      
      const result = getAllPaymentDatesForDay(fourWeeksPayment, july13Date);
      
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(13);
      expect(result[0].getMonth()).toBe(6);
      expect(result[0].getFullYear()).toBe(2025);
    });

    it('should include YEARLY payment in next year', () => {
      const yearlyPayment: RecurringPayment = {
        id: '8',
        user_id: 'user1',
        name: 'Annual Payment',
        amount: 1500,
        currency: 'USD',
        frequency: 'yearly',
        payment_source_id: 'source1',
        start_date: '2025-06-15', // June 15th, 2025
        category: 'insurance'
      };
      
      // Check if payment appears on June 15th, 2026
      const june15Next = new Date(2026, 5, 15); // June 15th, 2026
      
      const result = getAllPaymentDatesForDay(yearlyPayment, june15Next);
      
      expect(result).toHaveLength(1);
      expect(result[0].getDate()).toBe(15);
      expect(result[0].getMonth()).toBe(5);
      expect(result[0].getFullYear()).toBe(2026);
    });
  });
});
