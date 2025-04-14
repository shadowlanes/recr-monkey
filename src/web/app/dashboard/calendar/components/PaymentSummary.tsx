'use client';

import { CurrencyDollarIcon } from '@heroicons/react/24/outline';
import { useCallback } from 'react';
import { PaymentWithConversion } from '../../../types';

interface PaymentSummaryProps {
  recurringPaymentsCount: number;
  displayCurrency: string;
  isConverting: boolean;
  viewMode: 'month' | 'year';
  formatCurrency: (amount: number, currency: string) => string;
  convertedPayments: PaymentWithConversion[];
  paymentsInDisplayCurrency: Array<{ id: string; amount: number; }>;
  calendarDays: Array<{ date: Date | null; payments: any[]; }>;
  yearCalendar: Array<Array<{ date: Date | null; payments: any[]; }>>;
  currentDate: Date;
}

export function PaymentSummary({
  recurringPaymentsCount,
  displayCurrency,
  isConverting,
  viewMode,
  formatCurrency,
  convertedPayments,
  paymentsInDisplayCurrency,
  calendarDays,
  yearCalendar,
  currentDate
}: PaymentSummaryProps) {
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
          const amountInDisplayCurrency = displayCurrencyAmountMap.get(payment.payment.id) || payment.payment.amount;
          return daySum + amountInDisplayCurrency;
        }, 0), 0);
    } else {
      const currentMonth = currentDate.getMonth();
      if (yearCalendar.length > currentMonth && yearCalendar[currentMonth]) {
        return yearCalendar[currentMonth].reduce((sum, day) => 
          sum + day.payments.reduce((daySum, payment) => {
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
    
    const displayCurrencyAmountMap = new Map(
      paymentsInDisplayCurrency.map(payment => [payment.id, payment.amount])
    );
    
    if (yearCalendar.length === 0) return 0;
    
    return yearCalendar.reduce((sum, month) => 
      sum + month.reduce((monthSum, day) => 
        monthSum + day.payments.reduce((daySum, payment) => {
          const amountInDisplayCurrency = displayCurrencyAmountMap.get(payment.payment.id) || payment.payment.amount;
          return daySum + amountInDisplayCurrency;
        }, 0), 0), 0);
  }, [yearCalendar, convertedPayments, paymentsInDisplayCurrency]);

  const monthlyTotal = calculateMonthlyTotalInDisplayCurrency();
  const yearlyTotal = calculateYearlyTotalInDisplayCurrency();

  return (
    <div className="mb-6 p-5 bg-white rounded-lg border border-gray-100 shadow-sm">
      <h3 className="font-bold mb-3 text-[#4e5c6f] flex items-center">
        <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
        Payment Summary
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[#fff8f0] rounded-lg p-4 border border-[#f4e0d0]">
          <p className="text-sm text-[#4e5c6f] mb-1">Total Recurring Payments</p>
          <p className="text-2xl font-bold text-[#303030]">{recurringPaymentsCount}</p>
        </div>
        <div className="bg-[#fff8f0] rounded-lg p-4 border border-[#f4e0d0]">
          <p className="text-sm text-[#4e5c6f] mb-1">Monthly Total ({viewMode === 'month' ? 'Current' : 'All'} View)</p>
          <p className="text-2xl font-bold text-[#e06c00]">
            {isConverting ? (
              <span className="text-base">Converting currencies...</span>
            ) : (
              formatCurrency(monthlyTotal, displayCurrency)
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
              formatCurrency(yearlyTotal, displayCurrency)
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
