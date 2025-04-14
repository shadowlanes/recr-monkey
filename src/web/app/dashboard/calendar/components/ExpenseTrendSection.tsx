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

  // Calculate monthly totals using getAllPaymentDatesForDay
  const monthlyTotals = months.map(({ date, lastDay }) => {
    let monthTotal = 0;
    
    // Check each day of the month for payments
    for (let day = date; day <= lastDay; day.setDate(day.getDate() + 1)) {
      convertedPayments.forEach(payment => {
        const paymentDates = getAllPaymentDatesForDay(payment, new Date(day));
        if (paymentDates.length > 0) {
          const paymentAmount = paymentsInDisplayCurrency.find(p => p.id === payment.id)?.amount || 0;
          monthTotal += paymentAmount * paymentDates.length;
        }
      });
    }
    
    return monthTotal;
  });

  // Calculate yearly totals
  const totalYearlyExpense = monthlyTotals.reduce((acc, curr) => acc + curr, 0);
  const averageMonthlyExpense = totalYearlyExpense / 12;

  const chartData = {
    labels: months.map(m => m.label),
    datasets: [
      {
        label: 'Monthly Expenses',
        data: monthlyTotals,
        borderColor: '#e06c00',
        backgroundColor: '#fff0e6',
        fill: true,
        tension: 0.4,
        segment: {
          borderDash: (ctx: any) => ctx.p0DataIndex >= 6 ? [6, 6] : undefined,
        }
      },
      {
        label: 'Average Monthly Expense',
        data: Array(13).fill(averageMonthlyExpense),
        borderColor: '#4e5c6f',
        borderDash: [5, 5],
        tension: 0
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
      <div className="mb-8">
        <Line data={chartData} options={options} />
      </div>
      <div className="flex justify-between p-4 bg-gray-50 rounded-lg">
        <div>
          <p className="text-sm text-gray-600">Total Expenses (12 months)</p>
          <p className="text-xl font-semibold text-[#4e5c6f]">
            {formatCurrency(totalYearlyExpense, displayCurrency)}
          </p>
        </div>
        <div>
          <p className="text-sm text-gray-600">Average Monthly Expense</p>
          <p className="text-xl font-semibold text-[#4e5c6f]">
            {formatCurrency(averageMonthlyExpense, displayCurrency)}
          </p>
        </div>
      </div>
    </div>
  );
}
