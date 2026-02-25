import React from 'react';
import { cn } from '@/lib/utils';
import { GOLD } from '../theme/colors';

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
    <div className={cn('flex gap-3', className)}>
      <button
        type="button"
        onClick={() => onChange('yes')}
        disabled={disabled}
        className={cn(
          'flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isYes
            ? 'border-[#bfa76f] text-black'
            : 'border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800'
        )}
        style={isYes ? { backgroundColor: GOLD } : undefined}
      >
        {yesLabel}
      </button>
      <button
        type="button"
        onClick={() => onChange('no')}
        disabled={disabled}
        className={cn(
          'flex-1 rounded-lg border px-4 py-2 text-sm font-medium transition',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isNo
            ? 'border-[#bfa76f] text-black'
            : 'border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800'
        )}
        style={isNo ? { backgroundColor: GOLD } : undefined}
      >
        {noLabel}
      </button>
    </div>
  );
};

export default YesNoToggle;
