'use client';

import { useCallback } from 'react';
import { BanknotesIcon, CreditCardIcon, CurrencyDollarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PaymentWithConversion } from '../types';
import { PAYMENT_FREQUENCIES } from '../../../lib/supabase';

interface PaymentSourcesSectionProps {
  convertedPayments: PaymentWithConversion[];
  paymentSources: Array<{
    id: string;
    name: string;
    type: 'bank_account' | 'card';
    identifier: string;
  }>;
  displayCurrency: string;
  paymentsInDisplayCurrency: Array<{ id: string; amount: number; }>;
  formatCurrency: (amount: number, currency: string) => string;
  formatFrequency: (frequency: string) => string;
}

export function PaymentSourcesSection({
  convertedPayments,
  paymentSources,
  displayCurrency,
  paymentsInDisplayCurrency,
  formatCurrency,
  formatFrequency
}: PaymentSourcesSectionProps) {
  // Calculate payments grouped by source with USD conversion
  const calculatePaymentsBySource = useCallback(() => {
    if (convertedPayments.length === 0 || paymentSources.length === 0) {
      return [];
    }

    // Group payments by source
    const sourceGroups = paymentSources.map(source => {
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
    return sourceGroups.sort((a, b) => b.yearlyTotal - a.yearlyTotal);
  }, [convertedPayments, paymentSources]);

  const sourceGroups = calculatePaymentsBySource();

  return (
    <div className="space-y-5">
      {sourceGroups.length > 0 ? (
        sourceGroups.map((sourceGroup, index) => (
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
                    paymentsInDisplayCurrency.length > 0 && convertedPayments[0]
                      ? sourceGroup.monthlyTotal / convertedPayments[0].amountInUSD * 
                        (paymentsInDisplayCurrency.find(p => p.id === convertedPayments[0].id)?.amount ?? sourceGroup.monthlyTotal)
                      : sourceGroup.monthlyTotal,
                    displayCurrency
                  )}
                </p>
              </div>
              <div className="bg-[#f9f9f9] p-3 rounded-lg">
                <p className="text-[#4e5c6f] mb-1">Yearly Total</p>
                <p className="font-semibold text-[#303030]">
                  {formatCurrency(
                    paymentsInDisplayCurrency.length > 0 && convertedPayments[0]
                      ? sourceGroup.yearlyTotal / convertedPayments[0].amountInUSD * 
                        (paymentsInDisplayCurrency.find(p => p.id === convertedPayments[0].id)?.amount ?? sourceGroup.yearlyTotal)
                      : sourceGroup.yearlyTotal,
                    displayCurrency
                  )}
                </p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-[#4e5c6f] mb-2 font-medium">Recurring Payments:</p>
              <div className="text-sm space-y-2">
                {sourceGroup.payments.map((payment, idx) => {
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
        ))
      ) : (
        <p className="text-sm text-[#4e5c6f] py-4 text-center">No payment sources with recurring payments found.</p>
      )}
    </div>
  );
}
