'use client';

import { useState, useEffect, useRef } from 'react';
import { SUPPORTED_CURRENCIES, getDisplayCurrency, saveDisplayCurrency } from '../lib/supabase';
import { ChevronDownIcon } from '@heroicons/react/24/solid'; // Use solid icon for button

interface CurrencySelectorProps {
  className?: string;
}

export default function CurrencySelector({ className = '' }: CurrencySelectorProps) {
  const [selectedCurrency, setSelectedCurrency] = useState(getDisplayCurrency());
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null); // Ref for click outside detection

  // Handle currency selection from custom dropdown
  const handleCurrencySelect = (newCurrency: string) => {
    setSelectedCurrency(newCurrency);
    saveDisplayCurrency(newCurrency);
    setIsOpen(false); // Close dropdown after selection

    // Dispatch an event so other components can react to the currency change
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('currency-changed', { detail: newCurrency }));
    }
  };

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-3 py-1 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-[#e06c00]"
          id="options-menu"
          aria-haspopup="true"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedCurrency}
          <ChevronDownIcon className="-mr-1 ml-1 h-5 w-5 text-gray-400" aria-hidden="true" />
        </button>
      </div>

      {/* Dropdown panel, show/hide based on state */}
      {isOpen && (
        <div
          className="origin-top-right absolute right-0 mt-2 w-28 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10" // Added z-10
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="options-menu"
        >
          <div className="py-1 max-h-48 overflow-y-auto" role="none"> {/* Added max-height and overflow */}
            {SUPPORTED_CURRENCIES.map((currency) => (
              <button
                key={currency}
                onClick={() => handleCurrencySelect(currency)}
                className={`${
                  selectedCurrency === currency ? 'bg-gray-100 text-gray-900' : 'text-gray-700'
                } block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 hover:text-gray-900`}
                role="menuitem"
              >
                {currency}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}