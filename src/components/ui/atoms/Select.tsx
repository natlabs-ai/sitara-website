import React from 'react';
import { cn } from '@/lib/utils';
import type { Option } from '../theme/types';

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  className?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  placeholder,
  error,
  className,
  disabled,
  id,
  name,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <select
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      className={cn(
        'w-full rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100',
        'focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-red-500/40',
        className
      )}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export default Select;
