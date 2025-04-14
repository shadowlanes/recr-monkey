'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  convertToUSD, 
  convertCurrency,
  getDisplayCurrency
} from '../../lib/supabase';
import { PaymentDateItem, RecurringPayment } from '../../types';
import { useData } from '../../contexts/data-context';
import LoadingAnimation from '../../components/loading-animation';
import {
  CalendarDaysIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { PaymentSummary } from './components/PaymentSummary';
import { PaymentSourcesSection } from './components/PaymentSourcesSection';
import { CategoriesSection } from './components/CategoriesSection';
import { UpcomingPaymentsSection } from './components/UpcomingPaymentsSection';
import { CalendarSection } from './components/CalendarSection';
import { 
  getAllPaymentDatesForDay,
  formatFrequency,
  isToday,
  formatCurrency
} from './calendar-utils';

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

  const [convertedPayments, setConvertedPayments] = useState<PaymentWithConversion[]>([]);
  
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

  // Generate month calendar
  const generateMonthCalendar = useCallback(() => {
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const lastDay = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const firstDayOfWeek = firstDay.getDay();
    
    const days: Array<{ date: Date | null, payments: PaymentDateItem[] }> = [];
    
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

  // Handle mouse enter on payment item

  // Handle mouse leave on payment item

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
        displayCurrency={displayCurrency}
        isConverting={isConverting}
        viewMode={viewMode}
        formatCurrency={formatCurrency}
        convertedPayments={convertedPayments}
        paymentsInDisplayCurrency={paymentsInDisplayCurrency}
        calendarDays={calendarDays}
        yearCalendar={yearCalendar}
        currentDate={currentDate}
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
                convertedPayments={convertedPayments}
                paymentSources={paymentSources}
                displayCurrency={displayCurrency}
                paymentsInDisplayCurrency={paymentsInDisplayCurrency}
                formatCurrency={formatCurrency}
                formatFrequency={formatFrequency}
              />
            )}

            {activeTab === 'categories' && (
              <CategoriesSection 
                convertedPayments={convertedPayments}
                displayCurrency={displayCurrency}
                paymentsInDisplayCurrency={paymentsInDisplayCurrency}
                paymentSources={paymentSources}
                formatCurrency={formatCurrency}
                formatFrequency={formatFrequency}
              />
            )}

            {activeTab === 'upcoming' && (
              <UpcomingPaymentsSection 
                recurringPayments={recurringPayments}
                paymentSources={paymentSources}
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
                formatViewDate={formatViewDate}
                formatCurrency={formatCurrency}
                isToday={isToday}
                getMonthName={getMonthName}
                toggleViewMode={toggleViewMode}
                goToPrevious={goToPrevious}
                goToNext={goToNext}
                formatFrequency={formatFrequency}
                displayCurrency={displayCurrency}
                paymentsInDisplayCurrency={paymentsInDisplayCurrency}
                isConverting={isConverting}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}