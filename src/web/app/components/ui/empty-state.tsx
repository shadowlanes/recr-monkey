'use client';

import React from 'react';

interface EmptyStateProps {
  title: string;
  message: string;
  action?: React.ReactNode;
}

export default function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="text-center py-14 px-6 bg-surface border border-line rounded-2xl">
      <h3 className="font-display font-extrabold text-lg mb-2">{title}</h3>
      <p className="text-muted text-sm mb-5 max-w-sm mx-auto">{message}</p>
      {action}
    </div>
  );
}
