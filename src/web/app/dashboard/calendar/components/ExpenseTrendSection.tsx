'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { PaymentWithConversion } from '../page';
import { getAllPaymentDatesForDay } from '../calendar-utils';
import { useState, useMemo } from 'react';
import { getCategoryColor } from '../../../lib/categoryColors';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ExpenseTrendSectionProps {
  convertedPayments: PaymentWithConversion[];
  paymentsInDisplayCurrency: Array<{ id: string; amount: number; }>;
  displayCurrency: string;
  formatCurrency: (amount: number, currency: string) => string;
}

export function ExpenseTrendSection({
  convertedPayments,
  paymentsInDisplayCurrency,
  displayCurrency,
  formatCurrency
}: ExpenseTrendSectionProps) {
  // Change to array of selected categories
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Total']);

  // Toggle category selection
  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newSelection = prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category];
        
      return newSelection.length === 0 ? ['Total'] : newSelection;
    });
  };

  // Get unique categories
  const categories = useMemo(() => {
    const uniqueCategories = Array.from(new Set(convertedPayments.map(p => p.category || 'Other')));
    return ['Total', ...uniqueCategories];
  }, [convertedPayments]);

  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Generate last 6 months and next 6 months
  const months = Array.from({ length: 13 }, (_, i) => {
    const date = new Date(currentYear, currentMonth - 6 + i, 1);
    return {
      label: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      date: date,
      lastDay: new Date(date.getFullYear(), date.getMonth() + 1, 0)
    };
  });

  // Calculate monthly totals by category
  const monthlyTotalsByCategory = useMemo(() => {
    const categoryTotals: { [key: string]: number[] } = {};
    
    categories.forEach(category => {
      if (category === 'Total') return;
      
      categoryTotals[category] = months.map(({ date, lastDay }) => {
        let monthTotal = 0;
        const monthDate = new Date(date);
        
        while (monthDate <= lastDay) {
          const relevantPayments = convertedPayments.filter(p => (p.category || 'Other') === category);
          
          relevantPayments.forEach(payment => {
            const paymentDates = getAllPaymentDatesForDay(payment, new Date(monthDate));
            if (paymentDates.length > 0) {
              const paymentAmount = paymentsInDisplayCurrency.find(p => p.id === payment.id)?.amount || 0;
              monthTotal += paymentAmount * paymentDates.length;
            }
          });
          
          monthDate.setDate(monthDate.getDate() + 1);
        }
        return monthTotal;
      });
    });

    // Calculate total across all categories
    categoryTotals['Total'] = months.map((_, index) => {
      return Object.entries(categoryTotals)
        .filter(([cat]) => cat !== 'Total')
        .reduce((sum, [_, values]) => sum + values[index], 0);
    });

    return categoryTotals;
  }, [months, convertedPayments, paymentsInDisplayCurrency]);

  // Calculate yearly and average for selected categories
  const { totalYearlyExpense, averageMonthlyExpense } = useMemo(() => {
    // If only Total is selected or no categories selected
    if (selectedCategories.length === 1 && selectedCategories[0] === 'Total') {
      const totalValues = monthlyTotalsByCategory['Total'] || [];
      const yearlyTotal = totalValues.reduce((acc, curr) => acc + curr, 0);
      return {
        totalYearlyExpense: yearlyTotal,
        averageMonthlyExpense: yearlyTotal / 12
      };
    }

    // Calculate sum for selected individual categories only
    const yearlyTotal = selectedCategories
      .filter(cat => cat !== 'Total')  // Exclude Total to avoid double counting
      .reduce((total, category) => {
        const categoryValues = monthlyTotalsByCategory[category] || [];
        const categoryTotal = categoryValues.reduce((acc, curr) => acc + curr, 0);
        return total + categoryTotal;
      }, 0);

    return {
      totalYearlyExpense: yearlyTotal,
      averageMonthlyExpense: yearlyTotal / 12
    };
  }, [monthlyTotalsByCategory, selectedCategories]);

  const chartData = {
    labels: months.map(m => m.label),
    datasets: [
      ...selectedCategories.map(category => {
        const colors = getCategoryColor(category);
        return {
          label: `${category} Expenses`,
          data: monthlyTotalsByCategory[category] || [],
          borderColor: colors.color,
          backgroundColor: colors.light,
          fill: true,
          tension: 0.4,
          segment: {
            borderDash: (ctx: any) => ctx.p0DataIndex >= 6 ? [6, 6] : undefined,
          }
        };
      }),
      {
        label: 'Monthly Average',
        data: Array(months.length).fill(averageMonthlyExpense),
        borderColor: '#94a3b8', // Slate 400
        borderDash: [5, 5],
        borderWidth: 2,
        fill: false,
        tension: 0,
        pointRadius: 0
      }
    ]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: false
      }
    },
    scales: {
      y: {
        beginAtZero: true
      }
    }
  };

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(category => {
          const colors = getCategoryColor(category);
          return (
            <button
              key={category}
              onClick={() => toggleCategory(category)}
              style={{
                backgroundColor: colors.color,
                opacity: selectedCategories.includes(category) ? 1 : 0.2,
                color: 'white',
                transition: 'opacity 0.2s ease'
              }}
              className="px-3 py-1.5 rounded-full text-sm font-medium hover:opacity-80"
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="mb-8">
        <Line data={chartData} options={options} />
      </div>

      <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <div className="group relative">
            <p className="text-sm text-gray-600 flex items-center gap-1">
              {selectedCategories.length === 1 && selectedCategories[0] === 'Total' 
                ? 'Total Expenses (12 months)'
                : 'Category Total (12 months)'}
              <span className="inline-block w-4 h-4 bg-gray-200 rounded-full text-xs flex items-center justify-center text-gray-600 cursor-help">?</span>
            </p>
            {/* Tooltip */}
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block bg-white p-3 rounded-lg shadow-lg border border-gray-100 w-64 z-10">
              <p className="text-sm text-gray-600 mb-2">Including categories:</p>
              <ul className="text-xs space-y-1">
                {selectedCategories.map(category => (
                  <li key={category} className="flex items-center gap-2">
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: getCategoryColor(category).color }}
                    ></span>
                    {category}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xl font-semibold text-[#4e5c6f]">
            {formatCurrency(totalYearlyExpense, displayCurrency)}
          </p>
        </div>
        <div>
          <div className="group relative">
            <p className="text-sm text-gray-600 flex items-center gap-1">
              {selectedCategories.length === 1 && selectedCategories[0] === 'Total'
                ? 'Average Monthly Expense'
                : 'Category Monthly Average'}
              <span className="inline-block w-4 h-4 bg-gray-200 rounded-full text-xs flex items-center justify-center text-gray-600 cursor-help">?</span>
            </p>
            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block bg-white p-3 rounded-lg shadow-lg border border-gray-100 w-64 z-10">
              <p className="text-sm text-gray-600">Average monthly expense across selected categories</p>
            </div>
          </div>
          <p className="text-xl font-semibold text-[#4e5c6f]">
            {formatCurrency(averageMonthlyExpense, displayCurrency)}
          </p>
        </div>
      </div>
    </div>
  );
}
