import React from 'react';
import { cn } from '@/lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'type'> {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  className,
  disabled,
  id,
  name,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.checked);
  };

  const checkboxId = id || `checkbox-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="checkbox"
        id={checkboxId}
        name={name}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'h-4 w-4 rounded border-neutral-700 bg-black/60 text-[#bfa76f]',
          'focus:ring-1 focus:ring-[#bfa76f] focus:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'cursor-pointer'
        )}
        {...props}
      />
      {label && (
        <label
          htmlFor={checkboxId}
          className={cn(
            'text-sm text-neutral-100 cursor-pointer select-none',
            disabled && 'cursor-not-allowed opacity-50'
          )}
        >
          {label}
        </label>
      )}
    </div>
  );
};

export default Checkbox;
