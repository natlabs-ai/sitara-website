import React from 'react';
import { cn } from '@/lib/utils';

export interface YesNoToggleProps {
  value: 'yes' | 'no' | null;
  onChange: (value: 'yes' | 'no') => void;
  yesLabel?: string;
  noLabel?: string;
  disabled?: boolean;
  className?: string;
}

export const YesNoToggle: React.FC<YesNoToggleProps> = ({
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  disabled = false,
  className,
}) => {
  const isYes = value === 'yes';
  const isNo = value === 'no';

  return (
    <div
      className={cn(
        'inline-flex rounded-lg border border-neutral-700 bg-neutral-900 p-0.5',
        disabled && 'opacity-50 cursor-not-allowed',
        className
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
            className={cn(
              'relative px-5 py-1.5 text-sm font-medium rounded-md transition-all duration-150',
              'disabled:cursor-not-allowed',
              isSelected
                ? 'bg-neutral-700 text-neutral-100 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            )}
          >
            {isSelected && (
              <span
                className="absolute inset-0 rounded-md"
                style={{
                  boxShadow: 'inset 0 0 0 1px rgba(191,167,111,0.3)',
                  background: 'rgba(191,167,111,0.08)',
                }}
              />
            )}
            <span className="relative">{label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default YesNoToggle;
