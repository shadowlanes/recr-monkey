'use client';

import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface PaymentSummaryProps {
  recurringPaymentsCount: number;
  monthlyTotal: number;
  yearlyTotal: number;
  displayCurrency: string;
  isConverting: boolean;
  viewMode: 'month' | 'year';
  formatCurrency: (amount: number, currency: string) => string;
}

export function PaymentSummary({
  recurringPaymentsCount,
  monthlyTotal,
  yearlyTotal,
  displayCurrency,
  isConverting,
  viewMode,
  formatCurrency
}: PaymentSummaryProps) {
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
