'use client';

import React, { useEffect } from 'react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Stacks above another open dialog */
  elevated?: boolean;
}

export default function Dialog({ open, onClose, title, children, elevated = false }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 bg-scrim flex items-start justify-center overflow-y-auto p-4 ${elevated ? 'z-[60]' : 'z-50'}`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-surface rounded-[28px] w-full max-w-md mt-[6vh] p-7 shadow-float motion-safe:animate-[dialog-pop_.18s_ease-out]">
        <h2 className="font-display font-extrabold text-[22px] tracking-tight mb-5">{title}</h2>
        {children}
      </div>
    </div>
  );
}
