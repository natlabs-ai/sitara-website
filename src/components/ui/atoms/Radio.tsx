import React from 'react';
import { cn } from '@/lib/utils';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  checked: boolean;
  onChange: () => void;
  label: string;
  name: string;
  value: string;
  className?: string;
}

export const Radio: React.FC<RadioProps> = ({
  checked,
  onChange,
  label,
  name,
  value,
  className,
  disabled,
  id,
  ...props
}) => {
  const radioId = id || `radio-${name}-${value}`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="radio"
        id={radioId}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        className={cn(
          'h-4 w-4 border-neutral-700 bg-black/60 text-[#bfa76f]',
          'focus:ring-1 focus:ring-[#bfa76f] focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'cursor-pointer'
        )}
        {...props}
      />
      <label
        htmlFor={radioId}
        className={cn(
          'text-sm text-neutral-100 cursor-pointer select-none',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        {label}
      </label>
    </div>
  );
};

export default Radio;
