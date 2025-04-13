'use client';

import { useState, useEffect } from 'react';
import { SUPPORTED_CURRENCIES, getDisplayCurrency, saveDisplayCurrency } from '../lib/supabase';

interface CurrencySelectorProps {
  className?: string;
}

export default function CurrencySelector({ className = '' }: CurrencySelectorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(getDisplayCurrency());

  // Handle currency change
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newCurrency = e.target.value;
    setSelectedCurrency(newCurrency);
    saveDisplayCurrency(newCurrency);

    // Dispatch an event so other components can react to the currency change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('currency-changed', { detail: newCurrency }));
    }
  };

  return (
    <div className={`currency-selector ${className}`}>
      <select
        value={selectedCurrency}
        onChange={handleCurrencyChange}
        className="form-select py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        aria-label="Select display currency"
      >
        {SUPPORTED_CURRENCIES.map((currency) => (
          <option key={currency} value={currency}>
            {currency}
          </option>
        ))}
      </select>
    </div>
  );
}