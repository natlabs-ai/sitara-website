import React from 'react';
import { cn } from '@/lib/utils';

export interface YesNoToggleProps {
  value: 'yes' | 'no' | null;
  onChange: (value: 'yes' | 'no') => void;
  yesLabel?: string;
  noLabel?: string;
  disabled?: boolean;
  className?: string;
  /** Optional test identifier for E2E testing (buttons get `${testId}-yes` / `${testId}-no`) */
  testId?: string;
}

export const YesNoToggle: React.FC<YesNoToggleProps> = ({
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  disabled = false,
  className,
  testId,
}) => {
  return (
    <div
      data-testid={testId}
      className={cn(
        'inline-flex rounded-lg border border-neutral-700 bg-neutral-900 p-0.5',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {(['yes', 'no'] as const).map((option) => {
        const isSelected = value === option;
        const label = option === 'yes' ? yesLabel : noLabel;
        return (
          <button
            key={option}
            type="button"
            onClick={() => !disabled && onChange(option)}
            disabled={disabled}
            data-testid={testId ? `${testId}-${option}` : undefined}
            className={cn(
              'px-5 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
              'disabled:cursor-not-allowed',
              isSelected
                ? 'bg-[#bfa76f]/[0.08] text-[#bfa76f] ring-1 ring-inset ring-[#bfa76f]/40 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200',
            )}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
};

export default YesNoToggle;
