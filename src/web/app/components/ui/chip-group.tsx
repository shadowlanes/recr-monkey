'use client';

import React from 'react';

interface ChipOption<T extends string> {
  value: T;
  label: string;
}

interface ChipGroupProps<T extends string> {
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  'aria-label'?: string;
}

export default function ChipGroup<T extends string>({
  options,
  value,
  onChange,
  ...aria
}: ChipGroupProps<T>) {
  return (
    <div className="flex flex-wrap gap-2" role="radiogroup" {...aria}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`rounded-full px-4 py-2 text-[13.5px] cursor-pointer transition-colors border-[1.5px] focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 ${
              selected
                ? 'bg-ink border-ink text-bg font-bold'
                : 'bg-bg border-line text-muted font-semibold hover:text-ink'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
