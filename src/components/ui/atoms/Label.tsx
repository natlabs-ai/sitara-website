import React from 'react';
import { cn } from '@/lib/utils';

export interface LabelProps {
  htmlFor?: string;
  /** Whether the field is required (used for validation logic) */
  required?: boolean;
  /** Whether to show the error indicator (red asterisk). Only shown when true AND required AND invalid. */
  showError?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Label: React.FC<LabelProps> = ({
  htmlFor,
  required,
  showError = false,
  children,
  className,
}) => {
  // Only show red asterisk when validation has been triggered AND field is required AND invalid
  const showAsterisk = showError && required;

  return (
    <label
      htmlFor={htmlFor}
      className={cn('mb-1 block text-sm font-semibold text-neutral-100', className)}
    >
      {children}
      {showAsterisk && <span className="text-red-400"> *</span>}
    </label>
  );
};

export default Label;
