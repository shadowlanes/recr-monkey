'use client';

import { CurrencyDollarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PaymentWithConversion } from '../types';

interface CategoriesSectionProps {
  categoryGroups: Array<{
    category: string;
    payments: PaymentWithConversion[];
    count: number;
    monthlyTotal: number;
    yearlyTotal: number;
  }>;
  displayCurrency: string;
  paymentsInDisplayCurrency: Array<{ id: string; amount: number; }>;
  convertedPayments: PaymentWithConversion[];
  paymentSources: any[];
  formatCurrency: (amount: number, currency: string) => string;
  formatFrequency: (frequency: string) => string;
}

export function CategoriesSection({
  categoryGroups,
  displayCurrency,
  paymentsInDisplayCurrency,
  convertedPayments,
  paymentSources,
  formatCurrency,
  formatFrequency
}: CategoriesSectionProps) {
  return (
    <div className="space-y-5">
      {categoryGroups.length > 0 ? (
        categoryGroups.map((categoryGroup, index) => (
          <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
              <h5 className="font-medium text-[#303030] flex items-center">
                <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
                {categoryGroup.category}
              </h5>
              <span className="text-sm bg-[#fff0e6] px-2 py-1 rounded-full text-[#e06c00] font-medium">
                {categoryGroup.count} payment{categoryGroup.count !== 1 ? 's' : ''}
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-[#f9f9f9] p-3 rounded-lg">
                <p className="text-[#4e5c6f] mb-1">Monthly Total</p>
                <p className="font-semibold text-[#303030]">
                  {formatCurrency(
                    paymentsInDisplayCurrency.length > 0 && convertedPayments[0]
                      ? categoryGroup.monthlyTotal / convertedPayments[0].amountInUSD * 
                        (paymentsInDisplayCurrency.find(p => p.id === convertedPayments[0].id)?.amount ?? categoryGroup.monthlyTotal)
                      : categoryGroup.monthlyTotal,
                    displayCurrency
                  )}
                </p>
              </div>
              <div className="bg-[#f9f9f9] p-3 rounded-lg">
                <p className="text-[#4e5c6f] mb-1">Yearly Total</p>
                <p className="font-semibold text-[#303030]">
                  {formatCurrency(
                    paymentsInDisplayCurrency.length > 0 && convertedPayments[0]
                      ? categoryGroup.yearlyTotal / convertedPayments[0].amountInUSD * 
                        (paymentsInDisplayCurrency.find(p => p.id === convertedPayments[0].id)?.amount ?? categoryGroup.yearlyTotal)
                      : categoryGroup.yearlyTotal,
                    displayCurrency
                  )}
                </p>
              </div>
            </div>
            
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-[#4e5c6f] mb-2 font-medium">Recurring Payments:</p>
              <div className="text-sm space-y-2">
                {categoryGroup.payments.map((payment, idx) => {
                  const displayAmount = paymentsInDisplayCurrency.find(p => p.id === payment.id)?.amount;
                  const paymentSource = paymentSources.find(s => s.id === payment.payment_source_id);
                  
                  return (
                    <div key={idx} className="flex justify-between items-center p-2 hover:bg-[#f9f9f9] rounded-lg">
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="w-4 h-4 mr-2 text-[#e06c00]" />
                        <span className="text-[#303030]">{payment.name}</span>
                        {paymentSource && (
                          <span className="text-xs text-[#4e5c6f] ml-2">
                            ({paymentSource.type === 'bank_account' ? 'Bank' : 'Card'}: {paymentSource.name})
                          </span>
                        )}
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
        <p className="text-sm text-[#4e5c6f] py-4 text-center">No categorized payments found.</p>
      )}
    </div>
  );
}
