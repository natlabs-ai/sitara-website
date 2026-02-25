import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  value,
  onChange,
  error,
  className,
  disabled,
  placeholder,
  rows = 3,
  id,
  name,
  ...props
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <textarea
      id={id}
      name={name}
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      rows={rows}
      className={cn(
        'w-full rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500',
        'focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'resize-y',
        error && 'border-red-500/40',
        className
      )}
      {...props}
    />
  );
};

export default Textarea;
