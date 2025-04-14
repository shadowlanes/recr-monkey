'use client';

import { CurrencyDollarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { RecurringPayment } from '@/app/types';

interface UpcomingPaymentsSectionProps {
  upcomingPayments: Array<{
    payment: RecurringPayment;
    paymentSource: {
      id: string;
      name: string;
      type: 'bank_account' | 'card';
      identifier: string;
    };
    dueDate: Date;
    daysUntilDue: number;
  }>;
  displayCurrency: string;
  paymentsInDisplayCurrency: Array<{ id: string; amount: number; }>;
  formatCurrency: (amount: number, currency: string) => string;
  formatFrequency: (frequency: string) => string;
}

export function UpcomingPaymentsSection({
  upcomingPayments,
  displayCurrency,
  paymentsInDisplayCurrency,
  formatCurrency,
  formatFrequency
}: UpcomingPaymentsSectionProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-[#4e5c6f]">Showing payments due in the next 4 weeks</p>
      
      {upcomingPayments.length > 0 ? (
        upcomingPayments.map((upcomingPayment, index) => {
          // Find converted amount in display currency
          const displayAmount = paymentsInDisplayCurrency.find(
            p => p.id === upcomingPayment.payment.id
          )?.amount;
          
          // Determine urgency class based on days until due
          let urgencyClass = 'bg-green-50 text-green-700';
          if (upcomingPayment.daysUntilDue <= 3) {
            urgencyClass = 'bg-red-50 text-red-700';
          } else if (upcomingPayment.daysUntilDue <= 7) {
            urgencyClass = 'bg-orange-50 text-orange-700';
          }
          
          return (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <div className="flex justify-between items-center mb-3">
                <h5 className="font-medium text-[#303030] flex items-center">
                  <CurrencyDollarIcon className="w-5 h-5 mr-2 text-[#e06c00]" />
                  {upcomingPayment.payment.name}
                </h5>
                <span className={`text-sm px-2 py-1 rounded-full font-medium ${urgencyClass}`}>
                  {upcomingPayment.daysUntilDue === 0 
                    ? 'Due today' 
                    : upcomingPayment.daysUntilDue === 1 
                      ? 'Due tomorrow' 
                      : `Due in ${upcomingPayment.daysUntilDue} days`}
                </span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="bg-[#f9f9f9] p-3 rounded-lg">
                  <p className="text-[#4e5c6f] mb-1">Amount</p>
                  <p className="font-semibold text-[#303030]">
                    {formatCurrency(upcomingPayment.payment.amount, upcomingPayment.payment.currency)}
                    {displayCurrency !== upcomingPayment.payment.currency && displayAmount && (
                      <span className="block text-xs font-normal text-[#4e5c6f] mt-1">
                        {formatCurrency(displayAmount, displayCurrency)}
                      </span>
                    )}
                  </p>
                </div>
                <div className="bg-[#f9f9f9] p-3 rounded-lg">
                  <p className="text-[#4e5c6f] mb-1">Due Date</p>
                  <p className="font-medium text-[#303030]">
                    {upcomingPayment.dueDate.toLocaleDateString('en-US', { 
                      weekday: 'short',
                      month: 'short', 
                      day: 'numeric'
                    })}
                  </p>
                </div>
                <div className="bg-[#f9f9f9] p-3 rounded-lg">
                  <p className="text-[#4e5c6f] mb-1">Payment Source</p>
                  <p className="font-medium text-[#303030]">
                    {upcomingPayment.paymentSource ? (
                      <>
                        {upcomingPayment.paymentSource.name}
                        <span className="text-[#e06c00] ml-1 block text-xs">
                          {upcomingPayment.paymentSource.type === 'bank_account' ? 'Bank Account' : 'Card'} 
                          •••• {upcomingPayment.paymentSource.identifier}
                        </span>
                      </>
                    ) : (
                      'Unknown source'
                    )}
                  </p>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-100 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <span className="text-[#4e5c6f] mr-2">Category:</span>
                  <span className="text-[#303030]">{upcomingPayment.payment.category || 'Uncategorized'}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-[#4e5c6f] mr-2">Frequency:</span>
                  <span className="text-[#303030] flex items-center">
                    <ArrowPathIcon className="w-3 h-3 mr-1" />
                    {formatFrequency(upcomingPayment.payment.frequency)}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      ) : (
        <p className="text-sm text-[#4e5c6f] py-4 text-center">No upcoming payments in the next 4 weeks.</p>
      )}
    </div>
  );
}
