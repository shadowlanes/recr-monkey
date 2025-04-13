import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface OnboardingGuideProps {
  hasPaymentSources: boolean;
  hasRecurringPayments?: boolean;
  showButtons?: boolean;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ 
  hasPaymentSources, 
  hasRecurringPayments = false, 
  showButtons = false 
}) => {
  // Only show the guide if either payment sources or recurring payments are missing
  if (hasPaymentSources && hasRecurringPayments) {
    console.log('User has both payment sources and recurring payments, not showing onboarding guide.');
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Recr Monkey! 🐒</h2>
        <p className="text-gray-600">Let's get you started with tracking your recurring payments</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 border border-gray-200 rounded-md p-5 bg-gray-50 flex flex-col">
          <div className="flex items-center mb-4">
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mr-3 ${hasPaymentSources ? 'bg-green-100' : 'bg-indigo-100'}`}>
              {hasPaymentSources ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-indigo-700 font-bold">1</span>
              )}
            </div>
            <h3 className="text-lg font-semibold">Add Payment Source</h3>
          </div>
          <p className="text-gray-600 mb-4 flex-grow">First, add your payment sources like credit cards, bank accounts, or digital wallets.</p>
          {showButtons && (
            hasPaymentSources ? (
              <div className="btn block text-center w-full bg-green-500 text-white py-2 px-4 rounded-md flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Already Added
              </div>
            ) : (
              <Link href="/dashboard/payment-sources" className="btn block text-center w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors">
                Add Payment Source
              </Link>
            )
          )}
        </div>

        <div className="flex-1 border border-gray-200 rounded-md p-5 bg-gray-50 flex flex-col">
          <div className="flex items-center mb-4">
            <div className={`rounded-full w-8 h-8 flex items-center justify-center mr-3 ${hasRecurringPayments ? 'bg-green-100' : 'bg-indigo-100'}`}>
              {hasRecurringPayments ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="text-indigo-700 font-bold">2</span>
              )}
            </div>
            <h3 className="text-lg font-semibold">Set Up Recurring Payments</h3>
          </div>
          <p className="text-gray-600 mb-4 flex-grow">Then, add your recurring payments and subscriptions with their schedule.</p>
          {showButtons && (
            hasRecurringPayments ? (
              <div className="btn block text-center w-full bg-green-500 text-white py-2 px-4 rounded-md flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Already Added
              </div>
            ) : (
              <Link href="/dashboard/recurring-payments" className="btn block text-center w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors">
                Add Recurring Payment
              </Link>
            )
          )}
        </div>

        <div className="flex-1 border border-gray-200 rounded-md p-5 bg-gray-50 flex flex-col">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
              <span className="text-indigo-700 font-bold">3</span>
            </div>
            <h3 className="text-lg font-semibold">View Calendar</h3>
          </div>
          <p className="text-gray-600 mb-4 flex-grow">Finally, view all your upcoming payments in the calendar for easy tracking.</p>
          {showButtons && (
            <Link href="/dashboard/calendar" className="btn block text-center w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-md transition-colors">
              View Calendar
            </Link>
          )}
        </div>
      </div>

      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>This guide will disappear once you've added both payment sources and recurring payments.</p>
      </div>
    </div>
  );
};

export default OnboardingGuide;