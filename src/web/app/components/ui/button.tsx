'use client';

import React from 'react';

type Variant = 'primary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-accent text-on-accent font-bold shadow-glow hover:bg-accent-deep',
  ghost:
    'bg-surface text-ink font-semibold shadow-card hover:bg-hover',
  danger:
    'bg-transparent text-danger font-semibold border border-danger/40 hover:bg-danger-soft',
};

const SIZE_CLASSES: Record<Size, string> = {
  md: 'px-5 py-2.5 min-h-11 text-sm',
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
      className={`inline-flex items-center justify-center gap-2 rounded-full cursor-pointer transition-all focus-visible:outline-2 focus-visible:outline-accent focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
      {...props}
    />
  );
}
