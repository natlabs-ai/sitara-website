import React from 'react';
import { cn } from '@/lib/utils';

export interface SelectableCardProps {
  /** Whether this card is the currently selected option */
  selected: boolean;
  /** Called when the user picks this card */
  onSelect: () => void;
  /** Card content (usually the option label) */
  children: React.ReactNode;
  disabled?: boolean;
  /** When true and not selected, render dimmed (out of focus) — used when a sibling is selected */
  dimmed?: boolean;
  className?: string;
  /** Optional test identifier for E2E testing */
  testId?: string;
}

export const SelectableCard: React.FC<SelectableCardProps> = ({
  selected,
  onSelect,
  children,
  disabled = false,
  dimmed = false,
  className,
  testId,
}) => {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      onClick={() => !disabled && onSelect()}
      data-testid={testId}
      className={cn(
        'w-full text-left rounded-xl border p-4 text-sm transition',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#bfa76f]/50',
        disabled && 'opacity-50 cursor-not-allowed',
        selected
          ? 'border-[#bfa76f]/40 bg-[#bfa76f]/[0.08] text-[#bfa76f]'
          : 'border-neutral-800 bg-black/30 text-neutral-200 hover:border-neutral-600 hover:text-neutral-100',
        !selected && dimmed && 'opacity-50 hover:opacity-100',
        className,
      )}
    >
      {children}
    </button>
  );
};

export default SelectableCard;
