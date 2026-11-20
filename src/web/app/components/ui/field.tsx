'use client';

import React from 'react';

const CONTROL_CLASSES =
  'w-full text-[15px] font-medium text-ink bg-bg border-[1.5px] border-line rounded-2xl px-3.5 py-2.5 focus:border-accent focus:outline-none transition-colors';

interface FieldProps {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}

export function Field({ label, htmlFor, hint, children }: FieldProps) {
  return (
    <div className="mb-4">
      <label
        htmlFor={htmlFor}
        className="block text-[13px] font-semibold text-ink-soft mb-1.5"
      >
        {label}
      </label>
      {children}
      {hint && <p className="text-xs text-muted mt-1.5">{hint}</p>}
    </div>
  );
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...props }, ref) {
    return <input ref={ref} className={`${CONTROL_CLASSES} ${className}`} {...props} />;
  },
);

export function Select({
  className = '',
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`${CONTROL_CLASSES} ${className}`} {...props} />;
}
