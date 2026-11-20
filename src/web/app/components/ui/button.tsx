'use client';

import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-accent text-white font-bold shadow-[0_3px_0_var(--accent-deep)] hover:bg-accent-deep hover:shadow-none hover:translate-y-px',
  ghost:
    'bg-transparent text-muted font-semibold border border-line hover:text-ink',
  danger:
    'bg-transparent text-danger font-semibold border border-danger/40 hover:bg-danger-soft',
};

const SIZE_CLASSES: Record<Size, string> = {
  md: 'px-5 py-2 text-sm',
  sm: 'px-3.5 py-1.5 text-[13px]',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`rounded-full cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
