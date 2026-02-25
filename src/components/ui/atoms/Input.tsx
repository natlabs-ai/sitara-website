import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string | number;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export const Input: React.FC<InputProps> = ({
  type = 'text',
  value,
  onChange,
  error,
  className,
  disabled,
  placeholder,
  id,
  name,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  return (
    <input
      type={type}
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500',
        'focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        error && 'border-red-500/40',
        className
      )}
      {...props}
    />
  );
};

export default Input;
