'use client';

import { CurrencyDollarIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { PaymentWithConversion } from '../../../types';
import { PAYMENT_FREQUENCIES } from '../../../lib/supabase';
import { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Pie } from 'react-chartjs-2';
import { getCategoryColor, DEFAULT_CHART_COLORS } from '../../../lib/categoryColors';

ChartJS.register(ArcElement, Tooltip, Legend);

interface CategoriesSectionProps {
  convertedPayments: PaymentWithConversion[];
  displayCurrency: string;
  paymentsInDisplayCurrency: Array<{ id: string; amount: number; }>;
  paymentSources: any[];
  formatCurrency: (amount: number, currency: string) => string;
  formatFrequency: (frequency: string) => string;
}

export function CategoriesSection({
  convertedPayments,
  displayCurrency,
  paymentsInDisplayCurrency,
  paymentSources,
  formatCurrency,
  formatFrequency
}: CategoriesSectionProps) {
  
  // Calculate payments grouped by category with USD conversion
  const categoryGroups = useMemo(() => {
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

  const chartData = useMemo(() => {
    return {
      labels: categoryGroups.map(group => group.category),
      datasets: [
        {
          data: categoryGroups.map(group => group.yearlyTotal),
          backgroundColor: categoryGroups.map(group => 
            getCategoryColor(group.category).color || DEFAULT_CHART_COLORS[0]
          ),
          borderWidth: 1,
        },
      ],
    };
  }, [categoryGroups]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const value = context.raw;
            return `${context.label}: ${formatCurrency(value, displayCurrency)}`;
          },
        },
      },
    },
  };

  const categoryStats = useMemo(() => {
    if (categoryGroups.length === 0) return null;
    
    const highestSpend = categoryGroups[0]; // Already sorted by yearlyTotal
    const mostFrequent = [...categoryGroups].sort((a, b) => b.count - a.count)[0];
    
    // Calculate total yearly occurrences for most frequent category
    const yearlyOccurrences = mostFrequent.payments.reduce((total, payment) => {
      if (payment.frequency === PAYMENT_FREQUENCIES.MONTHLY) {
        return total + 12;
      } else if (payment.frequency === PAYMENT_FREQUENCIES.WEEKLY) {
        return total + 52;
      } else if (payment.frequency === PAYMENT_FREQUENCIES.FOUR_WEEKS) {
        return total + 13;
      } else if (payment.frequency === PAYMENT_FREQUENCIES.YEARLY) {
        return total + 1;
      }
      return total;
    }, 0);
    
    return {
      highestSpend,
      mostFrequent,
      yearlyOccurrences
    };
  }, [categoryGroups]);

  return (
    <div className="space-y-5">
      {categoryGroups.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <h4 className="font-medium text-[#303030] mb-4">Spending by Category</h4>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="h-[300px] flex-1">
              <Pie data={chartData} options={chartOptions} />
            </div>
            {categoryStats && (
              <div className="md:w-64 space-y-4 flex flex-col justify-center">
                <div>
                  <p className="text-sm text-[#4e5c6f] mb-1">Highest Spend Category</p>
                  <p className="font-medium text-[#303030]">{categoryStats.highestSpend.category}</p>
                  <p className="text-sm text-[#e06c00]">
                    {formatCurrency(categoryStats.highestSpend.yearlyTotal, displayCurrency)}/year
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#4e5c6f] mb-1">Most Frequent Category</p>
                  <p className="font-medium text-[#303030]">{categoryStats.mostFrequent.category}</p>
                  <p className="text-sm text-[#e06c00]">
                    {categoryStats.yearlyOccurrences} payments/year
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
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
