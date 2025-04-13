'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { supabase, TABLES, PAYMENT_FREQUENCIES } from '../../lib/supabase';
import { RecurringPayment, PaymentSource, PaymentDateItem } from '../../types';

// View mode types
type CalendarViewMode = 'month' | 'year';

export default function Calendar() {
  const { user } = useAuth();
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error loading data:', errorMessage);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [user]);

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

  // Calculate payments grouped by source
  const calculatePaymentsBySource = useCallback(() => {
    if (recurringPayments.length === 0 || paymentSources.length === 0) {
      return [];
    }

    // Group payments by source
    const paymentsBySource = paymentSources.map(source => {
      const sourcePayments = recurringPayments.filter(payment => 
        payment.payment_source_id === source.id
      );
      
      // Calculate totals
      const monthlyTotal = sourcePayments.reduce((sum, payment) => {
        // Monthly frequency payments
        if (payment.frequency === PAYMENT_FREQUENCIES.MONTHLY) {
          return sum + payment.amount;
        }
        // Weekly frequency payments (multiply by average weeks in a month)
        else if (payment.frequency === PAYMENT_FREQUENCIES.WEEKLY) {
          return sum + (payment.amount * 4.33);
        }
        // Every 4 weeks (slightly different than monthly)
        else if (payment.frequency === PAYMENT_FREQUENCIES.FOUR_WEEKS) {
          return sum + (payment.amount * 1.08); // 13 payments per year instead of 12
        }
        // Yearly frequency payments (divide by 12 for monthly equivalent)
        else if (payment.frequency === PAYMENT_FREQUENCIES.YEARLY) {
          return sum + (payment.amount / 12);
        }
        return sum;
      }, 0);

      const yearlyTotal = sourcePayments.reduce((sum, payment) => {
        // Monthly frequency payments
        if (payment.frequency === PAYMENT_FREQUENCIES.MONTHLY) {
          return sum + (payment.amount * 12);
        }
        // Weekly frequency payments
        else if (payment.frequency === PAYMENT_FREQUENCIES.WEEKLY) {
          return sum + (payment.amount * 52);
        }
        // Every 4 weeks
        else if (payment.frequency === PAYMENT_FREQUENCIES.FOUR_WEEKS) {
          return sum + (payment.amount * 13);
        }
        // Yearly frequency payments
        else if (payment.frequency === PAYMENT_FREQUENCIES.YEARLY) {
          return sum + payment.amount;
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

  // Generate a month calendar grid
  const renderMonthCalendar = () => {
    // ...existing code...
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div className="calendar-container">
        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-1">
          {dayNames.map(day => (
            <div 
              key={day} 
              className="text-center font-bold p-2 bg-gray-100 rounded-md"
            >
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, index) => (
            <div 
              key={index} 
              className={`calendar-day relative ${!day.date ? 'opacity-30' : ''} ${day.date && isToday(day.date) ? 'today bg-indigo-50' : ''}`}
            >
              {day.date && (
                <>
                  <div className="calendar-day-header">
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
      return <div className="text-center py-8">Loading year view...</div>;
    }

    const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    
    return (
      <div className="year-calendar-container grid grid-cols-3 md:grid-cols-4 gap-4">
        {yearCalendar.map((month, monthIndex) => (
          <div key={monthIndex} className="month-container">
            <h3 className="text-center font-bold mb-2">{getMonthName(monthIndex)}</h3>
            
            {/* Day headers - smaller for year view */}
            <div className="grid grid-cols-7 gap-0 mb-1">
              {dayNames.map(day => (
                <div 
                  key={day} 
                  className="text-center text-xs p-1 bg-gray-100"
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
                  className={`relative p-1 min-h-[24px] border border-gray-100 text-center ${!day.date ? 'opacity-30' : ''} ${day.date && isToday(day.date) ? 'bg-indigo-50' : ''}`}
                >
                  {day.date && (
                    <>
                      <div className="text-xs">{day.date.getDate()}</div>
                      {day.payments.length > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500"
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
            <div className="text-xs text-center mt-1">
              {month.reduce((count, day) => count + (day.date ? day.payments.length : 0), 0)} payments
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Calendar View</h2>
        <div className="flex items-center space-x-4">
          <button 
            onClick={toggleViewMode}
            className="btn btn-small bg-indigo-100 text-indigo-800 hover:bg-indigo-200"
          >
            {viewMode === 'month' ? 'Year View' : 'Month View'}
          </button>
          <div className="flex items-center space-x-2">
            <button 
              onClick={goToPrevious} 
              className="btn btn-small"
            >
              &larr; {viewMode === 'month' ? 'Prev' : 'Prev Year'}
            </button>
            <span className="text-lg font-medium">
              {formatViewDate()}
            </span>
            <button 
              onClick={goToNext} 
              className="btn btn-small"
            >
              {viewMode === 'month' ? 'Next' : 'Next Year'} &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* Payment Summary - moved to the top */}
      <div className="mb-6 p-4 bg-gray-50 rounded-md">
        <h3 className="font-bold mb-2">Payment Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-gray-600">Total Recurring Payments</p>
            <p className="text-xl font-bold">{recurringPayments.length}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Monthly Total (Based on {viewMode === 'month' ? 'Current' : 'All'} View)</p>
            <p className="text-xl font-bold">
              {formatCurrency(
                viewMode === 'month' 
                  ? calendarDays.reduce((sum, day) => 
                      sum + (day.payments.reduce((daySum, payment) => daySum + payment.payment.amount, 0)), 0)
                  : (yearCalendar.length > 0 && currentDate.getMonth() < yearCalendar.length 
                      ? yearCalendar[currentDate.getMonth()].reduce((sum, day) => 
                          sum + (day.payments.reduce((daySum, payment) => daySum + payment.payment.amount, 0)), 0)
                      : 0)
              , 'USD')}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Yearly Total</p>
            <p className="text-xl font-bold">
              {formatCurrency(calculateYearlyTotal(), 'USD')}
            </p>
          </div>
        </div>
        
        {/* See breakdown toggle button */}
        <div className="mt-3 text-right">
          <button 
            onClick={() => setShowBreakdown(!showBreakdown)}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center ml-auto"
          >
            {showBreakdown ? 'Hide breakdown' : 'See breakdown'} 
            <svg 
              className={`ml-1 w-4 h-4 transition-transform ${showBreakdown ? 'transform rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24" 
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
        
        {/* Breakdown section */}
        {showBreakdown && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <h4 className="font-semibold mb-3">Detailed Payment Breakdown</h4>
            
            {calculatePaymentsBySource().length > 0 ? (
              <div className="space-y-4">
                {calculatePaymentsBySource().map((sourceGroup, index) => (
                  <div key={index} className="bg-white p-3 rounded shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <h5 className="font-medium">{sourceGroup.source.name}</h5>
                      <span className="text-sm bg-gray-100 px-2 py-1 rounded">
                        {sourceGroup.count} payment{sourceGroup.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Type</p>
                        <p>{sourceGroup.source.type === 'bank_account' ? 'Bank Account' : 'Card'} ({sourceGroup.source.identifier})</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Monthly Total</p>
                        <p className="font-semibold">{formatCurrency(sourceGroup.monthlyTotal, 'USD')}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Yearly Total</p>
                        <p className="font-semibold">{formatCurrency(sourceGroup.yearlyTotal, 'USD')}</p>
                      </div>
                    </div>
                    
                    {/* List of payments for this source */}
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Recurring Payments:</p>
                      <div className="text-sm space-y-1">
                        {sourceGroup.payments.map((payment, idx) => (
                          <div key={idx} className="flex justify-between">
                            <span>{payment.name}</span>
                            <span className="font-medium">
                              {formatCurrency(payment.amount, payment.currency)} ({formatFrequency(payment.frequency)})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No payment sources with recurring payments found.</p>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="error-message mb-4">{error}</div>
      )}

      {isLoading ? (
        <div className="text-center py-8">Loading...</div>
      ) : recurringPayments.length === 0 ? (
        <div className="text-center py-8">
          <p>No recurring payments added yet. Add payments to see them in the calendar view.</p>
        </div>
      ) : (
        viewMode === 'month' ? renderMonthCalendar() : renderYearCalendar()
      )}
      
      {/* Payment details tooltip on hover */}
      {hoverPayment && (
        <div 
          className="fixed bg-white shadow-lg rounded-md p-3 z-50 border border-gray-200 w-64"
          style={{
            left: `${hoverPayment.position.x + 10}px`,
            top: `${hoverPayment.position.y + 10}px`
          }}
        >
          <div className="font-bold text-lg mb-1">{hoverPayment.paymentItem.payment.name}</div>
          <div className="mb-1">
            <span className="font-medium">Amount:</span> {formatCurrency(hoverPayment.paymentItem.payment.amount, hoverPayment.paymentItem.payment.currency)}
          </div>
          <div className="mb-1">
            <span className="font-medium">Frequency:</span> {formatFrequency(hoverPayment.paymentItem.payment.frequency)}
          </div>
          <div className="mb-1">
            <span className="font-medium">Start Date:</span> {new Date(hoverPayment.paymentItem.payment.start_date).toLocaleDateString()}
          </div>
          <div className="mb-1">
            <span className="font-medium">Payment Source:</span> {hoverPayment.paymentItem.paymentSource?.name || 'Unknown'}
          </div>
          {hoverPayment.paymentItem.paymentSource && (
            <div>
              <span className="font-medium">Source Type:</span> {hoverPayment.paymentItem.paymentSource.type === 'bank_account' 
                ? `Bank Account (${hoverPayment.paymentItem.paymentSource.identifier})` 
                : `Card (${hoverPayment.paymentItem.paymentSource.identifier})`}
            </div>
          )}
        </div>
      )}
    </div>
  );
}