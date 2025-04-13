'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { useRouter } from 'next/navigation';
import { 
  supabase, 
  TABLES, 
  PAYMENT_FREQUENCIES, 
  convertToUSD, 
  convertCurrency,
  getDisplayCurrency
} from '../../lib/supabase';
import { RecurringPayment, PaymentSource, PaymentDateItem } from '../../types';
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
} from '@heroicons/react/24/outline';

// View mode types
type CalendarViewMode = 'month' | 'year';

// Interface for payment with USD conversion
interface PaymentWithConversion extends RecurringPayment {
  amountInUSD: number;
}

export default function Calendar() {
  const { user } = useAuth();
  const router = useRouter();
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [convertedPayments, setConvertedPayments] = useState<PaymentWithConversion[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [showBreakdown, setShowBreakdown] = useState(false);

  // State for display currency
  const [displayCurrency, setDisplayCurrency] = useState<string>(getDisplayCurrency());
  
  // For tracking payments converted to the display currency
  const [paymentsInDisplayCurrency, setPaymentsInDisplayCurrency] = useState<Array<{
    id: string;
    amount: number;
  }>>([]);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      
      // Load payment sources
      const { data: sourcesData, error: sourcesError } = await supabase
        .from(TABLES.PAYMENT_SOURCES)
        .select('*')
        .eq('user_id', user?.id);
        
      if (sourcesError) throw sourcesError;
      setPaymentSources(sourcesData || []);
      
      // Load recurring payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from(TABLES.RECURRING_PAYMENTS)
        .select('*')
        .eq('user_id', user?.id);
        
      if (paymentsError) throw paymentsError;
      setRecurringPayments(paymentsData || []);
      
      // Check if user has payment sources but no recurring payments
      // If so, redirect to onboarding page
      if ((sourcesData && sourcesData.length > 0) && 
          (!paymentsData || paymentsData.length === 0)) {
        router.push('/dashboard/onboarding');
      }
      
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error loading data:', errorMessage);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user, router]);

  // Convert payments to USD
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

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  // Update calendar when current date or view mode changes
  useEffect(() => {
    if (viewMode === 'month') {
      generateMonthCalendar();
    } else {
      generateYearCalendar();
    }
  }, [currentDate, viewMode, recurringPayments, paymentSources, generateMonthCalendar, generateYearCalendar]);

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

  // Generate a month calendar grid
  const renderMonthCalendar = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="calendar-container">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {dayNames.map(day => (
            <div 
              key={day} 
              className="text-center font-bold p-2 bg-[#fff0e6] rounded-md text-[#4e5c6f]"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((day, index) => (
            <div 
              key={index} 
              className={`calendar-day relative ${!day.date ? 'opacity-30' : ''} ${day.date && isToday(day.date) ? 'today bg-[#fff0e6] border-[#e06c00]' : ''}`}
            >
              {day.date && (
                <>
                  <div className="calendar-day-header text-[#4e5c6f]">
                    {day.date.getDate()}
                  </div>
                  <div className="calendar-day-events overflow-y-auto max-h-24">
                    {day.payments.map((paymentData, i) => (
                      <div 
                        key={i} 
                        className="event-item text-xs cursor-pointer" 
                        onMouseEnter={(e) => handlePaymentMouseEnter(e, paymentData)}
                        onMouseLeave={handlePaymentMouseLeave}
                      >
                        <div className="font-semibold">{paymentData.payment.name}</div>
                        <div>{formatCurrency(paymentData.payment.amount, paymentData.payment.currency)}</div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Generate a year calendar grid showing all months
  const renderYearCalendar = () => {
    // Check if yearCalendar is ready
    if (yearCalendar.length === 0) {
      return (
        <div className="text-center py-8">
          <LoadingAnimation size="medium" />
        </div>
      );
    }

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    return (
      <div className="year-calendar-container grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {yearCalendar.map((month, monthIndex) => (
          <div key={monthIndex} className="month-container bg-white rounded-lg shadow-sm p-3 border border-gray-100">
            <h3 className="text-center font-bold mb-2 text-[#303030]">{getMonthName(monthIndex)}</h3>
            
            {/* Day headers - smaller for year view */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {dayNames.map(day => (
                <div 
                  key={day} 
                  className="text-center text-xs p-1 bg-[#fff0e6] text-[#4e5c6f] font-medium"
                >
                  {day}
                </div>
              ))}
            </div>
            
            {/* Calendar days - smaller for year view */}
            <div className="grid grid-cols-7 gap-0">
              {month.map((day, dayIndex) => (
                <div 
                  key={dayIndex} 
                  className={`relative p-1 min-h-[24px] border border-gray-100 text-center ${!day.date ? 'opacity-30' : ''} ${day.date && isToday(day.date) ? 'bg-[#fff0e6]' : ''}`}
                >
                  {day.date && (
                    <>
                      <div className="text-xs text-[#4e5c6f]">{day.date.getDate()}</div>
                      {day.payments.length > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-1 bg-[#e06c00]"
                          onMouseEnter={(e) => handlePaymentMouseEnter(e, day.payments[0])}
                          onMouseLeave={handlePaymentMouseLeave}
                        ></div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
            
            {/* Payment count for this month */}
            <div className="text-xs text-center mt-2 text-[#4e5c6f] font-medium">
              {month.reduce((count, day) => count + (day.date ? day.payments.length : 0), 0)} payments
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#4e5c6f] flex items-center">
          <CalendarDaysIcon className="w-7 h-7 mr-2 text-[#e06c00]" />
          Calendar View
        </h2>
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleViewMode}
            className="btn btn-small bg-[#fff0e6] text-[#e06c00] hover:bg-[#ffe2cf] flex items-center gap-1"
          >
            <CalendarIcon className="w-5 h-5" />
            {viewMode === 'month' ? 'Year View' : 'Month View'}
          </button>
          <div className="flex items-center space-x-2">
            <button 
              onClick={goToPrevious} 
              className="btn btn-small bg-white border border-gray-200 hover:bg-gray-50"
              aria-label="Previous period"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <span className="text-lg font-medium text-[#303030] px-2">
              {formatViewDate()}
            </span>
            <button 
              onClick={goToNext} 
              className="btn btn-small bg-white border border-gray-200 hover:bg-gray-50"
              aria-label="Next period"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Summary - moved to the top */}
      <div className="mb-6 p-5 bg-white rounded-lg border border-gray-100 shadow-sm">
        <h3 className="font-bold mb-3 text-[#4e5c6f] flex items-center">
          <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
          Payment Summary
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#fff8f0] rounded-lg p-4 border border-[#f4e0d0]">
            <p className="text-sm text-[#4e5c6f] mb-1">Total Recurring Payments</p>
            <p className="text-2xl font-bold text-[#303030]">{recurringPayments.length}</p>
          </div>
          <div className="bg-[#fff8f0] rounded-lg p-4 border border-[#f4e0d0]">
            <p className="text-sm text-[#4e5c6f] mb-1">Monthly Total ({viewMode === 'month' ? 'Current' : 'All'} View)</p>
            <p className="text-2xl font-bold text-[#e06c00]">
              {isConverting ? (
                <span className="text-base">Converting currencies...</span>
              ) : (
                formatCurrency(calculateMonthlyTotalInDisplayCurrency(), displayCurrency)
              )}
            </p>
            <p className="text-xs text-[#4e5c6f] mt-1">All amounts shown in {displayCurrency}</p>
          </div>
          <div className="bg-[#fff8f0] rounded-lg p-4 border border-[#f4e0d0]">
            <p className="text-sm text-[#4e5c6f] mb-1">Yearly Total</p>
            <p className="text-2xl font-bold text-[#e06c00]">
              {isConverting ? (
                <span className="text-base">Converting currencies...</span>
              ) : (
                formatCurrency(calculateYearlyTotalInDisplayCurrency(), displayCurrency)
              )}
            </p>
          </div>
        </div>
        
        {/* See breakdown toggle button */}
        <div className="mt-4">
          <button 
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="flex items-center w-full justify-center py-2 border-t border-gray-200 text-[#4e5c6f] hover:text-[#e06c00] font-medium transition-colors"
          >
            {showBreakdown ? 'Hide breakdown' : 'See detailed breakdown'} 
            {showBreakdown ? (
              <ChevronUpIcon className="ml-1 w-5 h-5" />
            ) : (
              <ChevronDownIcon className="ml-1 w-5 h-5" />
            )}
          </button>
        </div>
        
        {/* Breakdown section */}
        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-4 text-[#303030]">Detailed Payment Breakdown</h4>
            
            {isConverting ? (
              <div className="text-center py-6">
                <LoadingAnimation size="small" />
                <p className="text-sm text-[#4e5c6f] mt-2">Converting currencies to {displayCurrency}...</p>
              </div>
            ) : calculatePaymentsBySource().length > 0 ? (
              <div className="space-y-5">
                {calculatePaymentsBySource().map((sourceGroup, index) => (
                  <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center">
                        {sourceGroup.source.type === 'bank_account' ? (
                          <BanknotesIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
                        ) : (
                          <CreditCardIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
                        )}
                        <h5 className="font-medium text-[#303030]">{sourceGroup.source.name}</h5>
                      </div>
                      <span className="text-sm bg-[#fff0e6] px-2 py-1 rounded-full text-[#e06c00] font-medium">
                        {sourceGroup.count} payment{sourceGroup.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div className="bg-[#f9f9f9] p-3 rounded-lg">
                        <p className="text-[#4e5c6f] mb-1">Source Type</p>
                        <p className="font-medium text-[#303030]">
                          {sourceGroup.source.type === 'bank_account' ? 'Bank Account' : 'Card'} 
                          <span className="text-[#e06c00] ml-1">•••• {sourceGroup.source.identifier}</span>
                        </p>
                      </div>
                      <div className="bg-[#f9f9f9] p-3 rounded-lg">
                        <p className="text-[#4e5c6f] mb-1">Monthly Total</p>
                        <p className="font-semibold text-[#303030]">
                          {formatCurrency(
                            // Convert USD amount to display currency
                            paymentsInDisplayCurrency.length > 0
                              ? sourceGroup.monthlyTotal / convertedPayments[0].amountInUSD * 
                                paymentsInDisplayCurrency.find(p => p.id === convertedPayments[0].id)?.amount || sourceGroup.monthlyTotal
                              : sourceGroup.monthlyTotal,
                            displayCurrency
                          )}
                        </p>
                      </div>
                      <div className="bg-[#f9f9f9] p-3 rounded-lg">
                        <p className="text-[#4e5c6f] mb-1">Yearly Total</p>
                        <p className="font-semibold text-[#303030]">
                          {formatCurrency(
                            // Convert USD amount to display currency
                            paymentsInDisplayCurrency.length > 0
                              ? sourceGroup.yearlyTotal / convertedPayments[0].amountInUSD * 
                                paymentsInDisplayCurrency.find(p => p.id === convertedPayments[0].id)?.amount || sourceGroup.yearlyTotal
                              : sourceGroup.yearlyTotal,
                            displayCurrency
                          )}
                        </p>
                      </div>
                    </div>
                    
                    {/* List of payments for this source */}
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <p className="text-xs text-[#4e5c6f] mb-2 font-medium">Recurring Payments:</p>
                      <div className="text-sm space-y-2">
                        {sourceGroup.payments.map((payment, idx) => {
                          // Find converted amount in display currency
                          const displayAmount = paymentsInDisplayCurrency.find(p => p.id === payment.id)?.amount;
                          
                          return (
                            <div key={idx} className="flex justify-between items-center p-2 hover:bg-[#f9f9f9] rounded-lg">
                              <div className="flex items-center">
                                <CurrencyDollarIcon className="w-4 h-4 mr-2 text-[#e06c00]" />
                                <span className="text-[#303030]">{payment.name}</span>
                              </div>
                              <div className="text-right">
                                <div className="font-medium text-[#303030]">
                                  {formatCurrency(payment.amount, payment.currency)}
                                </div> 
                                {displayCurrency !== payment.currency && displayAmount && (
                                  <div className="text-xs text-[#4e5c6f]">
                                    {formatCurrency(displayAmount, displayCurrency)}
                                  </div>
                                )}
                                <div className="text-xs text-[#4e5c6f] flex items-center justify-end mt-1">
                                  <ArrowPathIcon className="w-3 h-3 mr-1" />
                                  {formatFrequency(payment.frequency)}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#4e5c6f] py-4 text-center">No payment sources with recurring payments found.</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message mb-4 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
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
        <div className="bg-white p-5 rounded-lg border border-gray-100 shadow-sm">
          {viewMode === 'month' ? renderMonthCalendar() : renderYearCalendar()}
        </div>
      )}
      
      {/* Payment details tooltip on hover */}
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