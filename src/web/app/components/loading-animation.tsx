import React from 'react';

interface LoadingAnimationProps {
  size?: 'small' | 'medium' | 'large';
}

const EMOJI_SIZE: Record<string, string> = {
  small: 'text-2xl',
  medium: 'text-4xl',
  large: 'text-5xl',
};

export default function LoadingAnimation({ size = 'medium' }: LoadingAnimationProps) {
  if (size === 'small') {
    return (
      <span className="inline-block animate-bounce" role="status" aria-label="Loading">
        🐒
      </span>
    );
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-10"
      role="status"
      aria-label="Loading"
    >
      <span className={`${EMOJI_SIZE[size]} animate-bounce`}>🐒</span>
      <span className="text-sm font-semibold text-muted animate-pulse">Loading…</span>
    </div>
  );
}
