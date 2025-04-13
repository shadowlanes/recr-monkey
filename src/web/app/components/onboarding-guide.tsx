import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface OnboardingGuideProps {
  hasPaymentSources: boolean;
}

const OnboardingGuide: React.FC<OnboardingGuideProps> = ({ hasPaymentSources }) => {
  // Only show the guide if the user has no payment sources
  if (hasPaymentSources) {
    console.log('User has payment sources, not showing onboarding guide.');
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Recurring Monkey! 🐒</h2>
        <p className="text-gray-600">Let's get you started with tracking your recurring payments</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 border border-gray-200 rounded-md p-5 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
              <span className="text-indigo-700 font-bold">1</span>
            </div>
            <h3 className="text-lg font-semibold">Add Payment Source</h3>
          </div>
          <p className="text-gray-600 mb-4">First, add your payment sources like credit cards, bank accounts, or digital wallets.</p>
          <Link 
            href="/dashboard/payment-sources" 
            className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2 px-4 rounded transition duration-150 ease-in-out"
          >
            Add Payment Source
          </Link>
        </div>

        <div className="flex-1 border border-gray-200 rounded-md p-5 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
              <span className="text-indigo-700 font-bold">2</span>
            </div>
            <h3 className="text-lg font-semibold">Set Up Recurring Payments</h3>
          </div>
          <p className="text-gray-600 mb-4">Then, add your recurring payments and subscriptions with their schedule.</p>
          <div className="block w-full text-center bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded cursor-not-allowed">
            Add Recurring Payment
            <p className="text-xs mt-1">(Add a payment source first)</p>
          </div>
        </div>

        <div className="flex-1 border border-gray-200 rounded-md p-5 bg-gray-50">
          <div className="flex items-center mb-4">
            <div className="bg-indigo-100 rounded-full w-8 h-8 flex items-center justify-center mr-3">
              <span className="text-indigo-700 font-bold">3</span>
            </div>
            <h3 className="text-lg font-semibold">View Calendar</h3>
          </div>
          <p className="text-gray-600 mb-4">Finally, view all your upcoming payments in the calendar for easy tracking.</p>
          <div className="block w-full text-center bg-gray-300 text-gray-500 font-medium py-2 px-4 rounded cursor-not-allowed">
            View Calendar
            <p className="text-xs mt-1">(Set up payments first)</p>
          </div>
        </div>
      </div>

      <div className="mt-6 text-center text-gray-500 text-sm">
        <p>This guide will disappear once you've added your first payment source.</p>
      </div>
    </div>
  );
};

export default OnboardingGuide;