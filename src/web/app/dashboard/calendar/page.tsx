'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../components/auth/auth-provider';
import { supabase, TABLES, PAYMENT_FREQUENCIES } from '../../lib/supabase';
import { RecurringPayment, PaymentSource, PaymentDateItem } from '../../types';

export default function Calendar() {
  const { user } = useAuth();
  const [recurringPayments, setRecurringPayments] = useState<RecurringPayment[]>([]);
  const [paymentSources, setPaymentSources] = useState<PaymentSource[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [calendarDays, setCalendarDays] = useState<Array<{ date: Date | null, payments: PaymentDateItem[] }>>([]);
  const [hoverPayment, setHoverPayment] = useState<{
    paymentItem: PaymentDateItem;
    position: { x: number; y: number };
  } | null>(null);

  // Load data when component mounts
  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  // Update calendar when current month changes or when payments/sources change
  useEffect(() => {
    generateCalendarDays();
  }, [currentMonth, recurringPayments, paymentSources]);

  const loadData = async () => {
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
    } catch (error: any) {
      console.error('Error loading data:', error.message);
      setError('Failed to load data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const generateCalendarDays = () => {
    // Get first day of the month
    const firstDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    // Get last day of the month
    const lastDay = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    
    // Get day of week for first day (0 = Sunday, 6 = Saturday)
    const firstDayOfWeek = firstDay.getDay();
    
    const days: Array<{ date: Date | null, payments: PaymentDateItem[] }> = [];
    
    // Add empty slots for days before the first day of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      days.push({ date: null, payments: [] });
    }
    
    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      const date = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
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
  };

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
        let currentDate = new Date(startDate);
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
        let currentDate = new Date(startDate);
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

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
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

  // Format month and year for display
  const formatMonthYear = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Generate the calendar grid
  const renderCalendar = () => {
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
  };

  return (
    <div>
      <div className="section-header flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Calendar View</h2>
        <div className="flex items-center space-x-2">
          <button 
            onClick={goToPreviousMonth} 
            className="btn btn-small"
          >
            &larr; Prev
          </button>
          <span className="text-lg font-medium">
            {formatMonthYear(currentMonth)}
          </span>
          <button 
            onClick={goToNextMonth} 
            className="btn btn-small"
          >
            Next &rarr;
          </button>
        </div>
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
        renderCalendar()
      )}
    </div>
  );
}