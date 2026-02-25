'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

export interface CollapsibleProps {
  title: string;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Collapsible: React.FC<CollapsibleProps> = ({
  title,
  badge,
  defaultOpen = false,
  children,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={cn('rounded-xl border border-neutral-800 bg-black/30', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between p-4 text-left transition hover:bg-black/40"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-neutral-100">{title}</span>
          {badge}
        </div>
        <svg
          className={cn('h-5 w-5 text-neutral-400 transition-transform', isOpen && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && <div className="border-t border-neutral-800 p-4">{children}</div>}
    </div>
  );
};

export default Collapsible;
