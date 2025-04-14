'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  PAYMENT_FREQUENCIES, 
  convertToUSD, 
  convertCurrency,
  getDisplayCurrency
} from '../../lib/supabase';
import { PaymentDateItem, RecurringPayment } from '../../types';
import { useData } from '../../contexts/data-context';
import LoadingAnimation from '../../components/loading-animation';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarDaysIcon,
  CalendarIcon, 
  CurrencyDollarIcon,
  BanknotesIcon,
  CreditCardIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { PaymentSummary } from './components/PaymentSummary';
import { PaymentSourcesSection } from './components/PaymentSourcesSection';
import { CategoriesSection } from './components/CategoriesSection';
import { UpcomingPaymentsSection } from './components/UpcomingPaymentsSection';
import { CalendarSection } from './components/CalendarSection';

// View mode types
type CalendarViewMode = 'month' | 'year';

// Interface for payment with USD conversion
interface PaymentWithConversion extends RecurringPayment {
  amountInUSD: number;
}

export default function Calendar() {
  const router = useRouter();
  // Use centralized data context
  const { 
    recurringPayments, 
    paymentSources, 
    isLoading,
    error: dataError
  } = useData();
  
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<CalendarViewMode>('month');
  const [calendarDays, setCalendarDays] = useState<Array<{ date: Date | null, payments: PaymentDateItem[] }>>([]);
  const [yearCalendar, setYearCalendar] = useState<Array<Array<{ date: Date | null, payments: PaymentDateItem[] }>>>([]);
  const [hoverPayment, setHoverPayment] = useState<{
    paymentItem: PaymentDateItem;
    position: { x: number; y: number };
  } | null>(null);
  const [convertedPayments, setConvertedPayments] = useState<PaymentWithConversion[]>([]);
  const [showBreakdown, setShowBreakdown] = useState(false);
  // Tab state for breakdown section
  const [activeBreakdownTab, setActiveBreakdownTab] = useState<'sources' | 'categories' | 'upcoming'>('sources');

  // State for display currency
  const [displayCurrency, setDisplayCurrency] = useState<string>(getDisplayCurrency());
  
  // For tracking payments converted to the display currency
  const [paymentsInDisplayCurrency, setPaymentsInDisplayCurrency] = useState<Array<{
    id: string;
    amount: number;
  }>>([]);

  // Update the type to include 'calendar' as a valid tab
  const [activeTab, setActiveTab] = useState<'sources' | 'categories' | 'upcoming' | 'calendar'>('calendar');

  // Convert payments to USD whenever recurring payments change
  useEffect(() => {
    const convertPaymentAmounts = async () => {
      if (recurringPayments.length === 0) return;
      
      setIsConverting(true);
      try {
        // Create converted payments with USD amounts
        const converted = await Promise.all(
          recurringPayments.map(async (payment) => {
            // Convert amount to USD
            const amountInUSD = await convertToUSD(payment.amount, payment.currency);
            return {
              ...payment,
              amountInUSD
            };
          })
        );
        
        setConvertedPayments(converted);
      } catch (error) {
        console.error('Error converting currencies:', error);
      } finally {
        setIsConverting(false);
      }
    };
    
    convertPaymentAmounts();
  }, [recurringPayments]);

  // Listen for currency change events
  useEffect(() => {
    const handleCurrencyChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      const newCurrency = customEvent.detail;
      setDisplayCurrency(newCurrency);
    };

    window.addEventListener('currency-changed', handleCurrencyChange);
    
    return () => {
      window.removeEventListener('currency-changed', handleCurrencyChange);
    };
  }, []);

  // Convert payments to display currency when currency changes or payments are loaded
  useEffect(() => {
    const convertToDisplayCurrency = async () => {
      if (convertedPayments.length === 0) return;
      
      setIsConverting(true);
      try {
        // First, convert all amounts to the selected display currency
        const converted = await Promise.all(
          convertedPayments.map(async (payment) => {
            // Convert from USD to the selected display currency
            const convertedAmount = await convertCurrency(
              payment.amountInUSD, 
              'USD', 
              displayCurrency
            );
            
            return {
              id: payment.id,
              amount: convertedAmount
            };
          })
        );
        
        setPaymentsInDisplayCurrency(converted);
      } catch (error) {
        console.error('Error converting to display currency:', error);
      } finally {
        setIsConverting(false);
      }
    };
    
    convertToDisplayCurrency();
  }, [convertedPayments, displayCurrency]);

  // Get all payment occurrences for a day
  const getAllPaymentDatesForDay = (payment: RecurringPayment, dayDate: Date): Date[] => {
    const paymentDates: Date[] = [];
    const startDate = new Date(payment.start_date);
    
    // If start date is after the target day's month/year, no payments yet
    if (startDate.getFullYear() > dayDate.getFullYear() || 
        (startDate.getFullYear() === dayDate.getFullYear() && 
         startDate.getMonth() > dayDate.getMonth())) {
      return paymentDates;
    }
    
    // Check if there's a payment on this day based on the frequency
    switch (payment.frequency) {
      case PAYMENT_FREQUENCIES.WEEKLY: {
        // Find the first occurrence in or before this month
        const currentDate = new Date(startDate);
        while (currentDate.getFullYear() < dayDate.getFullYear() || 
               (currentDate.getFullYear() === dayDate.getFullYear() && 
                currentDate.getMonth() < dayDate.getMonth())) {
          currentDate.setDate(currentDate.getDate() + 7);
        }
        
        // Go back one occurrence to ensure we don't miss the first one in this month
        currentDate.setDate(currentDate.getDate() - 7);
        
        // Check all weekly occurrences in this month
        while (currentDate.getFullYear() <= dayDate.getFullYear() && 
               currentDate.getMonth() <= dayDate.getMonth()) {
          // Move to next occurrence
          currentDate.setDate(currentDate.getDate() + 7);
          
          // If this occurrence is in the correct month and day, add it
          if (currentDate.getMonth() === dayDate.getMonth() && 
              currentDate.getFullYear() === dayDate.getFullYear() && 
              currentDate.getDate() === dayDate.getDate()) {
            paymentDates.push(new Date(currentDate));
          }
        }
        break;
      }
      
      case PAYMENT_FREQUENCIES.MONTHLY: {
        // For monthly payments, just check if the day of the month matches
        if (startDate.getDate() === dayDate.getDate()) {
          // Create a date for this monthly payment in the current view month
          const paymentDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          
          // Only add if the payment date is on or after the start date
          if (paymentDate >= startDate) {
            paymentDates.push(paymentDate);
          }
        }
        break;
      }
      
      case PAYMENT_FREQUENCIES.FOUR_WEEKS: {
        // Similar to weekly but with 28-day intervals
        const currentDate = new Date(startDate);
        while (currentDate.getFullYear() < dayDate.getFullYear() || 
               (currentDate.getFullYear() === dayDate.getFullYear() && 
                currentDate.getMonth() < dayDate.getMonth())) {
          currentDate.setDate(currentDate.getDate() + 28);
        }
        
        // Go back one occurrence to ensure we don't miss the first one in this month
        currentDate.setDate(currentDate.getDate() - 28);
        
        // Check all 4-week occurrences in this month
        while (currentDate.getFullYear() <= dayDate.getFullYear() && 
               currentDate.getMonth() <= dayDate.getMonth()) {
          // Move to next occurrence
          currentDate.setDate(currentDate.getDate() + 28);
          
          // If this occurrence is in the correct month and day, add it
          if (currentDate.getMonth() === dayDate.getMonth() && 
              currentDate.getFullYear() === dayDate.getFullYear() && 
              currentDate.getDate() === dayDate.getDate()) {
            paymentDates.push(new Date(currentDate));
          }
        }
        break;
      }
      
      case PAYMENT_FREQUENCIES.YEARLY: {
        // For yearly payments, check if the month and day match
        if (startDate.getDate() === dayDate.getDate() && 
            startDate.getMonth() === dayDate.getMonth()) {
          // Create a date for this yearly payment in the current view year
          const paymentDate = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate());
          
          // Only add if the payment date is on or after the start date
          if (paymentDate >= startDate) {
            paymentDates.push(paymentDate);
          }
        }
        break;
      }
    }
    
    return paymentDates;
  };

  // Generate month calendar
  const generateMonthCalendar = useCallback(() => {
    // Get first day of the month
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    // Get last day of the month
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    
    // Get day of week for first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    const days: Array<{ date: Date | null, payments: PaymentDateItem[] }> = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, payments: [] });
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      days.push({ date, payments: [] });
    }
    
    // Calculate payments for each day
    if (recurringPayments.length > 0) {
      // For each day in the calendar
      days.forEach(day => {
        if (!day.date) return;
        
        // For each recurring payment
        recurringPayments.forEach(payment => {
          // Get all payment occurrences for this day in the month
          const paymentDates = getAllPaymentDatesForDay(payment, day.date!);
          
          // Add each payment occurrence to the day
          paymentDates.forEach(paymentDate => {
            const paymentSource = paymentSources.find(s => s.id === payment.payment_source_id);
            
            day.payments.push({
              date: paymentDate,
              payment,
              paymentSource
            });
          });
        });
        
        // Sort payments by amount (highest first)
        day.payments.sort((a, b) => b.payment.amount - a.payment.amount);
      });
    }
    
    setCalendarDays(days);
  }, [currentDate, recurringPayments, paymentSources]);

  // Generate year calendar
  const generateYearCalendar = useCallback(() => {
    const monthsCalendar: Array<Array<{ date: Date | null, payments: PaymentDateItem[] }>> = [];
    
    for (let month = 0; month < 12; month++) {
      // Create a new date for each month of the current year
      const monthDate = new Date(currentDate.getFullYear(), month, 1);
      
      // Get first day of the month
      const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      // Get last day of the month
      const lastDay = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0);
      
      // Get day of week for first day (0 = Sunday, 6 = Saturday)
      const firstDayOfWeek = firstDay.getDay();
      
      const days: Array<{ date: Date | null, payments: PaymentDateItem[] }> = [];
      
      // Add empty slots for days before the first day of the month
      for (let i = 0; i < firstDayOfWeek; i++) {
        days.push({ date: null, payments: [] });
      }
      
      // Add all days of the month
      for (let i = 1; i <= lastDay.getDate(); i++) {
        const date = new Date(monthDate.getFullYear(), monthDate.getMonth(), i);
        days.push({ date, payments: [] });
      }
      
      // Calculate payments for each day
      if (recurringPayments.length > 0) {
        // For each day in the calendar
        days.forEach(day => {
          if (!day.date) return;
          
          // For each recurring payment
          recurringPayments.forEach(payment => {
            // Get all payment occurrences for this day in the month
            const paymentDates = getAllPaymentDatesForDay(payment, day.date!);
            
            // Add each payment occurrence to the day
            paymentDates.forEach(paymentDate => {
              const paymentSource = paymentSources.find(s => s.id === payment.payment_source_id);
              
              day.payments.push({
                date: paymentDate,
                payment,
                paymentSource
              });
            });
          });
          
          // Sort payments by amount (highest first)
          day.payments.sort((a, b) => b.payment.amount - a.payment.amount);
        });
      }
      
      monthsCalendar.push(days);
    }
    
    setYearCalendar(monthsCalendar);
  }, [currentDate, recurringPayments, paymentSources]);

  // Update calendar when current date or view mode changes
  useMemo(() => {
    // Always generate both month and year data regardless of the current view mode
    // This ensures yearly totals are calculated correctly even when starting in month view
    generateMonthCalendar();
    generateYearCalendar();
  }, [generateMonthCalendar, generateYearCalendar]);

  // Calculate payments grouped by source with USD conversion
  const calculatePaymentsBySource = useCallback(() => {
    if (convertedPayments.length === 0 || paymentSources.length === 0) {
      return [];
    }

    // Group payments by source
    const paymentsBySource = paymentSources.map(source => {
      const sourcePayments = convertedPayments.filter(payment => 
        payment.payment_source_id === source.id
      );
      
      // Calculate totals using converted USD amounts
      const monthlyTotal = sourcePayments.reduce((sum, payment) => {
        // Monthly frequency payments
        if (payment.frequency === PAYMENT_FREQUENCIES.MONTHLY) {
          return sum + payment.amountInUSD;
        }
        // Weekly frequency payments (multiply by average weeks in a month)
        else if (payment.frequency === PAYMENT_FREQUENCIES.WEEKLY) {
          return sum + (payment.amountInUSD * 4.33);
        }
        // Every 4 weeks (slightly different than monthly)
        else if (payment.frequency === PAYMENT_FREQUENCIES.FOUR_WEEKS) {
          return sum + (payment.amountInUSD * 1.08); // 13 payments per year instead of 12
        }
        // Yearly frequency payments (divide by 12 for monthly equivalent)
        else if (payment.frequency === PAYMENT_FREQUENCIES.YEARLY) {
          return sum + (payment.amountInUSD / 12);
        }
        return sum;
      }, 0);

      const yearlyTotal = sourcePayments.reduce((sum, payment) => {
        // Monthly frequency payments
        if (payment.frequency === PAYMENT_FREQUENCIES.MONTHLY) {
          return sum + (payment.amountInUSD * 12);
        }
        // Weekly frequency payments
        else if (payment.frequency === PAYMENT_FREQUENCIES.WEEKLY) {
          return sum + (payment.amountInUSD * 52);
        }
        // Every 4 weeks
        else if (payment.frequency === PAYMENT_FREQUENCIES.FOUR_WEEKS) {
          return sum + (payment.amountInUSD * 13);
        }
        // Yearly frequency payments
        else if (payment.frequency === PAYMENT_FREQUENCIES.YEARLY) {
          return sum + payment.amountInUSD;
        }
        return sum;
      }, 0);

      return {
        source,
        payments: sourcePayments,
        count: sourcePayments.length,
        monthlyTotal,
        yearlyTotal
      };
    }).filter(group => group.payments.length > 0); // Remove sources with no payments

    // Sort by yearly total (highest first)
    return paymentsBySource.sort((a, b) => b.yearlyTotal - a.yearlyTotal);
  }, [convertedPayments, paymentSources]);

  // Calculate payments grouped by category with USD conversion
  const calculatePaymentsByCategory = useCallback(() => {
    if (convertedPayments.length === 0) {
      return [];
    }

    // Group payments by category
    const categoriesMap = new Map<string, {
      category: string;
      payments: PaymentWithConversion[];
      count: number;
      monthlyTotal: number;
      yearlyTotal: number;
    }>();

    // Process each payment
    convertedPayments.forEach(payment => {
      const category = payment.category || 'Uncategorized';
      
      if (!categoriesMap.has(category)) {
        categoriesMap.set(category, {
          category,
          payments: [],
          count: 0,
          monthlyTotal: 0,
          yearlyTotal: 0
        });
      }
      
      const categoryData = categoriesMap.get(category)!;
      categoryData.payments.push(payment);
      categoryData.count += 1;
      
      // Calculate monthly contribution
      if (payment.frequency === PAYMENT_FREQUENCIES.MONTHLY) {
        categoryData.monthlyTotal += payment.amountInUSD;
      } else if (payment.frequency === PAYMENT_FREQUENCIES.WEEKLY) {
        categoryData.monthlyTotal += (payment.amountInUSD * 4.33);
      } else if (payment.frequency === PAYMENT_FREQUENCIES.FOUR_WEEKS) {
        categoryData.monthlyTotal += (payment.amountInUSD * 1.08);
      } else if (payment.frequency === PAYMENT_FREQUENCIES.YEARLY) {
        categoryData.monthlyTotal += (payment.amountInUSD / 12);
      }
      
      // Calculate yearly contribution
      if (payment.frequency === PAYMENT_FREQUENCIES.MONTHLY) {
        categoryData.yearlyTotal += (payment.amountInUSD * 12);
      } else if (payment.frequency === PAYMENT_FREQUENCIES.WEEKLY) {
        categoryData.yearlyTotal += (payment.amountInUSD * 52);
      } else if (payment.frequency === PAYMENT_FREQUENCIES.FOUR_WEEKS) {
        categoryData.yearlyTotal += (payment.amountInUSD * 13);
      } else if (payment.frequency === PAYMENT_FREQUENCIES.YEARLY) {
        categoryData.yearlyTotal += payment.amountInUSD;
      }
    });
    
    // Convert map to array and sort by yearly total
    return Array.from(categoriesMap.values())
      .sort((a, b) => b.yearlyTotal - a.yearlyTotal);
  }, [convertedPayments]);

  // Calculate upcoming payments in the next 4 weeks
  const calculateUpcomingPayments = useCallback(() => {
    if (recurringPayments.length === 0) return [];
    
    const today = new Date();
    const fourWeeksLater = new Date(today);
    fourWeeksLater.setDate(today.getDate() + 28);
    
    const upcomingPayments: Array<{
      payment: RecurringPayment;
      paymentSource: any;
      dueDate: Date;
      daysUntilDue: number;
    }> = [];
    
    // Calculate next occurrence for each payment
    recurringPayments.forEach(payment => {
      const paymentSource = paymentSources.find(s => s.id === payment.payment_source_id);
      const startDate = new Date(payment.start_date);
      
      // Skip if start date is in the future beyond our 4-week window
      if (startDate > fourWeeksLater) return;
      
      // Calculate next occurrence based on frequency
      let nextOccurrence = new Date(startDate);
      
      // If start date is in the past, find the next upcoming occurrence
      if (startDate < today) {
        switch (payment.frequency) {
          case PAYMENT_FREQUENCIES.WEEKLY: {
            // Find next weekly occurrence
            while (nextOccurrence < today) {
              nextOccurrence.setDate(nextOccurrence.getDate() + 7);
            }
            break;
          }
          case PAYMENT_FREQUENCIES.MONTHLY: {
            // Find next monthly occurrence
            while (nextOccurrence < today) {
              nextOccurrence.setMonth(nextOccurrence.getMonth() + 1);
            }
            break;
          }
          case PAYMENT_FREQUENCIES.FOUR_WEEKS: {
            // Find next 4-weekly occurrence
            while (nextOccurrence < today) {
              nextOccurrence.setDate(nextOccurrence.getDate() + 28);
            }
            break;
          }
          case PAYMENT_FREQUENCIES.YEARLY: {
            // Find next yearly occurrence
            while (nextOccurrence < today) {
              nextOccurrence.setFullYear(nextOccurrence.getFullYear() + 1);
            }
            break;
          }
        }
      }
      
      // Only include if next occurrence is within our 4-week window
      if (nextOccurrence <= fourWeeksLater) {
        const daysUntilDue = Math.ceil((nextOccurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        upcomingPayments.push({
          payment,
          paymentSource,
          dueDate: nextOccurrence,
          daysUntilDue
        });
      }
    });
    
    // Sort by due date (soonest first)
    return upcomingPayments.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [recurringPayments, paymentSources]);

  // Navigate to previous period (month or year)
  const goToPrevious = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear() - 1, 0, 1));
    }
  };

  // Navigate to next period (month or year)
  const goToNext = () => {
    if (viewMode === 'month') {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else {
      setCurrentDate(new Date(currentDate.getFullYear() + 1, 0, 1));
    }
  };

  // Toggle between month and year view
  const toggleViewMode = () => {
    setViewMode(viewMode === 'month' ? 'year' : 'month');
  };

  // Handle mouse enter on payment item
  const handlePaymentMouseEnter = (e: React.MouseEvent, paymentItem: PaymentDateItem) => {
    setHoverPayment({
      paymentItem,
      position: { x: e.clientX, y: e.clientY }
    });
  };

  // Handle mouse leave on payment item
  const handlePaymentMouseLeave = () => {
    setHoverPayment(null);
  };

  // Format currency amount
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD'
    }).format(amount);
  };

  // Format frequency for display
  const formatFrequency = (frequency: string) => {
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
  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  // Format date for display based on view mode
  const formatViewDate = (): string => {
    if (viewMode === 'month') {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    } else {
      return currentDate.getFullYear().toString();
    }
  };

  // Get month name for year view
  const getMonthName = (monthIndex: number): string => {
    return new Date(currentDate.getFullYear(), monthIndex, 1).toLocaleDateString('en-US', { month: 'short' });
  };

  // Calculate monthly total based on current view
  const calculateMonthlyTotal = (): number => {
    if (viewMode === 'month') {
      return calendarDays.reduce((sum, day) => 
        sum + day.payments.reduce((daySum, payment) => daySum + payment.payment.amount, 0), 0);
    } else {
      // Make sure we have data for the current month before calculating
      const currentMonth = currentDate.getMonth();
      if (yearCalendar.length > currentMonth && yearCalendar[currentMonth]) {
        return yearCalendar[currentMonth].reduce((sum, day) => 
          sum + day.payments.reduce((daySum, payment) => daySum + payment.payment.amount, 0), 0);
      }
      return 0;
    }
  };

  // Calculate yearly total
  const calculateYearlyTotal = (): number => {
    // Make sure we have yearCalendar data before calculating
    if (yearCalendar.length === 0) return 0;
    
    return yearCalendar.reduce((sum, month) => 
      sum + month.reduce((monthSum, day) => 
        monthSum + day.payments.reduce((daySum, payment) => daySum + payment.payment.amount, 0), 0), 0);
  };

  // Calculate monthly total based on current view using USD conversion
  const calculateMonthlyTotalUSD = useCallback((): number => {
    if (convertedPayments.length === 0) return 0;
    
    // Create a lookup for USD amounts
    const usdAmountMap = new Map(
      convertedPayments.map(payment => [payment.id, payment.amountInUSD])
    );
    
    if (viewMode === 'month') {
      return calendarDays.reduce((sum, day) => 
        sum + day.payments.reduce((daySum, payment) => {
          // Use the converted USD amount if available
          const amountInUSD = usdAmountMap.get(payment.payment.id) || payment.payment.amount;
          return daySum + amountInUSD;
        }, 0), 0);
    } else {
      // Make sure we have data for the current month before calculating
      const currentMonth = currentDate.getMonth();
      if (yearCalendar.length > currentMonth && yearCalendar[currentMonth]) {
        return yearCalendar[currentMonth].reduce((sum, day) => 
          sum + day.payments.reduce((daySum, payment) => {
            // Use the converted USD amount if available
            const amountInUSD = usdAmountMap.get(payment.payment.id) || payment.payment.amount;
            return daySum + amountInUSD;
          }, 0), 0);
      }
      return 0;
    }
  }, [viewMode, calendarDays, yearCalendar, convertedPayments, currentDate]);

  // Calculate yearly total using USD conversion
  const calculateYearlyTotalUSD = useCallback((): number => {
    if (convertedPayments.length === 0) return 0;
    
    // Create a lookup for USD amounts
    const usdAmountMap = new Map(
      convertedPayments.map(payment => [payment.id, payment.amountInUSD])
    );
    
    // Make sure we have yearCalendar data before calculating
    if (yearCalendar.length === 0) return 0;
    
    return yearCalendar.reduce((sum, month) => 
      sum + month.reduce((monthSum, day) => 
        monthSum + day.payments.reduce((daySum, payment) => {
          // Use the converted USD amount if available
          const amountInUSD = usdAmountMap.get(payment.payment.id) || payment.payment.amount;
          return daySum + amountInUSD;
        }, 0), 0), 0);
  }, [yearCalendar, convertedPayments]);

  // Calculate monthly total in the selected display currency
  const calculateMonthlyTotalInDisplayCurrency = useCallback((): number => {
    if (convertedPayments.length === 0 || paymentsInDisplayCurrency.length === 0) return 0;
    
    // Create a lookup for display currency amounts
    const displayCurrencyAmountMap = new Map(
      paymentsInDisplayCurrency.map(payment => [payment.id, payment.amount])
    );
    
    if (viewMode === 'month') {
      return calendarDays.reduce((sum, day) => 
        sum + day.payments.reduce((daySum, payment) => {
          // Use the converted display currency amount if available
          const amountInDisplayCurrency = displayCurrencyAmountMap.get(payment.payment.id) || payment.payment.amount;
          return daySum + amountInDisplayCurrency;
        }, 0), 0);
    } else {
      // Make sure we have data for the current month before calculating
      const currentMonth = currentDate.getMonth();
      if (yearCalendar.length > currentMonth && yearCalendar[currentMonth]) {
        return yearCalendar[currentMonth].reduce((sum, day) => 
          sum + day.payments.reduce((daySum, payment) => {
            // Use the converted display currency amount if available
            const amountInDisplayCurrency = displayCurrencyAmountMap.get(payment.payment.id) || payment.payment.amount;
            return daySum + amountInDisplayCurrency;
          }, 0), 0);
      }
      return 0;
    }
  }, [viewMode, calendarDays, yearCalendar, convertedPayments, paymentsInDisplayCurrency, currentDate]);

  // Calculate yearly total in the selected display currency
  const calculateYearlyTotalInDisplayCurrency = useCallback((): number => {
    if (convertedPayments.length === 0 || paymentsInDisplayCurrency.length === 0) return 0;
    
    // Create a lookup for display currency amounts
    const displayCurrencyAmountMap = new Map(
      paymentsInDisplayCurrency.map(payment => [payment.id, payment.amount])
    );
    
    // Make sure we have yearCalendar data before calculating
    if (yearCalendar.length === 0) return 0;
    
    return yearCalendar.reduce((sum, month) => 
      sum + month.reduce((monthSum, day) => 
        monthSum + day.payments.reduce((daySum, payment) => {
          // Use the converted display currency amount if available
          const amountInDisplayCurrency = displayCurrencyAmountMap.get(payment.payment.id) || payment.payment.amount;
          return daySum + amountInDisplayCurrency;
        }, 0), 0), 0);
  }, [yearCalendar, convertedPayments, paymentsInDisplayCurrency]);

  // Determine which error to display
  const displayError = error || dataError;

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4e5c6f] flex items-center">
          <CalendarDaysIcon className="w-7 h-7 mr-2 text-[#e06c00]" />
          Calendar View
        </h2>
      </div>

      <PaymentSummary 
        recurringPaymentsCount={recurringPayments.length}
        monthlyTotal={calculateMonthlyTotalInDisplayCurrency()}
        yearlyTotal={calculateYearlyTotalInDisplayCurrency()}
        displayCurrency={displayCurrency}
        isConverting={isConverting}
        viewMode={viewMode}
        formatCurrency={formatCurrency}
      />

      {displayError && (
        <div className="error-message mb-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {displayError}
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-8">
          <LoadingAnimation size="large" />
        </div>
      ) : recurringPayments.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-100 shadow-sm">
          <div className="w-16 h-16 mx-auto bg-[#fff0e6] rounded-full flex items-center justify-center mb-4">
            <CalendarDaysIcon className="w-8 h-8 text-[#e06c00]" />
          </div>
          <p className="text-[#4e5c6f] mb-4">No recurring payments added yet. Add payments to see them in the calendar view.</p>
          <button 
            onClick={() => router.push('/dashboard/recurring-payments')}
            className="btn btn-primary flex items-center gap-2 mx-auto"
          >
            <PlusIcon className="w-5 h-5" />
            <span>Add Recurring Payment</span>
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-100 shadow-sm">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('sources')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'sources'
                  ? 'text-[#e06c00] border-[#e06c00]'
                  : 'text-[#4e5c6f] border-transparent hover:text-[#303030]'
              }`}
            >
              Payment Sources
            </button>
            <button
              onClick={() => setActiveTab('categories')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'categories'
                  ? 'text-[#e06c00] border-[#e06c00]'
                  : 'text-[#4e5c6f] border-transparent hover:text-[#303030]'
              }`}
            >
              Categories
            </button>
            <button
              onClick={() => setActiveTab('upcoming')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'upcoming'
                  ? 'text-[#e06c00] border-[#e06c00]'
                  : 'text-[#4e5c6f] border-transparent hover:text-[#303030]'
              }`}
            >
              Upcoming Payments
            </button>
            <button
              onClick={() => setActiveTab('calendar')}
              className={`px-4 py-3 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'calendar'
                  ? 'text-[#e06c00] border-[#e06c00]'
                  : 'text-[#4e5c6f] border-transparent hover:text-[#303030]'
              }`}
            >
              Calendar
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {activeTab === 'sources' && (
              <PaymentSourcesSection 
                sourceGroups={calculatePaymentsBySource()}
                displayCurrency={displayCurrency}
                paymentsInDisplayCurrency={paymentsInDisplayCurrency}
                convertedPayments={convertedPayments}
                formatCurrency={formatCurrency}
                formatFrequency={formatFrequency}
              />
            )}

            {activeTab === 'categories' && (
              <CategoriesSection 
                categoryGroups={calculatePaymentsByCategory()}
                displayCurrency={displayCurrency}
                paymentsInDisplayCurrency={paymentsInDisplayCurrency}
                convertedPayments={convertedPayments}
                paymentSources={paymentSources}
                formatCurrency={formatCurrency}
                formatFrequency={formatFrequency}
              />
            )}

            {activeTab === 'upcoming' && (
              <UpcomingPaymentsSection 
                upcomingPayments={calculateUpcomingPayments()}
                displayCurrency={displayCurrency}
                paymentsInDisplayCurrency={paymentsInDisplayCurrency}
                formatCurrency={formatCurrency}
                formatFrequency={formatFrequency}
              />
            )}

            {activeTab === 'calendar' && (
              <CalendarSection 
                viewMode={viewMode}
                currentDate={currentDate}
                calendarDays={calendarDays}
                yearCalendar={yearCalendar}
                handlePaymentMouseEnter={handlePaymentMouseEnter}
                handlePaymentMouseLeave={handlePaymentMouseLeave}
                toggleViewMode={toggleViewMode}
                goToPrevious={goToPrevious}
                goToNext={goToNext}
                formatViewDate={formatViewDate}
                formatCurrency={formatCurrency}
                isToday={isToday}
                getMonthName={getMonthName}
              />
            )}
          </div>
        </div>
      )}
      
      {/* Payment details tooltip */}
      {hoverPayment && (
        <div 
          className="fixed bg-white shadow-lg rounded-lg p-4 z-50 border border-gray-200 w-72"
          style={{
            left: `${hoverPayment.position.x + 10}px`,
            top: `${hoverPayment.position.y + 10}px`
          }}
        >
          <div className="font-bold text-lg mb-2 text-[#303030] pb-2 border-b border-gray-100">
            {hoverPayment.paymentItem.payment.name}
          </div>
          
          <div className="grid grid-cols-[100px_1fr] gap-y-2 text-sm">
            <span className="font-medium text-[#4e5c6f]">Amount:</span> 
            <span className="text-[#e06c00] font-semibold">
              {formatCurrency(hoverPayment.paymentItem.payment.amount, hoverPayment.paymentItem.payment.currency)}
            </span>
            
            {/* Show converted amount if available and different from original currency */}
            {displayCurrency !== hoverPayment.paymentItem.payment.currency && (
              <>
                <span className="font-medium text-[#4e5c6f]">Converted:</span>
                <span className="text-[#4e5c6f]">
                  {isConverting ? 'Converting...' : (
                    <>
                      {formatCurrency(
                        paymentsInDisplayCurrency.find(
                          p => p.id === hoverPayment.paymentItem.payment.id
                        )?.amount || hoverPayment.paymentItem.payment.amount,
                        displayCurrency
                      )}
                    </>
                  )}
                </span>
              </>
            )}
            
            <span className="font-medium text-[#4e5c6f]">Category:</span>
            <span className="text-[#303030]">{hoverPayment.paymentItem.payment.category || 'Other'}</span>
            
            <span className="font-medium text-[#4e5c6f]">Frequency:</span> 
            <span className="text-[#303030]">{formatFrequency(hoverPayment.paymentItem.payment.frequency)}</span>
            
            <span className="font-medium text-[#4e5c6f]">Start Date:</span> 
            <span className="text-[#303030]">{new Date(hoverPayment.paymentItem.payment.start_date).toLocaleDateString()}</span>
            
            <span className="font-medium text-[#4e5c6f]">Source:</span> 
            <span className="text-[#303030]">{hoverPayment.paymentItem.paymentSource?.name || 'Unknown'}</span>
            
            {hoverPayment.paymentItem.paymentSource && (
              <>
                <span className="font-medium text-[#4e5c6f]">Type:</span> 
                <span className="text-[#303030]">
                  {hoverPayment.paymentItem.paymentSource.type === 'bank_account' 
                    ? 'Bank Account' 
                    : 'Card'} 
                  <span className="text-[#e06c00] ml-1">
                    •••• {hoverPayment.paymentItem.paymentSource.identifier}
                  </span>
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}