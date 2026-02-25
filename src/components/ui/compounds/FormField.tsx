import React from 'react';
import { cn } from '@/lib/utils';
import { Label } from '../atoms/Label';
import { HelperText } from '../atoms/HelperText';

export interface FormFieldProps {
  label?: string;
  /** Whether the field is required (used for validation logic) */
  required?: boolean;
  /** Error message to display */
  error?: string;
  /**
   * Whether to show the error state (red asterisk + error styling).
   * When false, error styling is hidden even if error prop is set.
   * Defaults to true for backwards compatibility.
   */
  showError?: boolean;
  helperText?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  label,
  required,
  error,
  showError = true,
  helperText,
  htmlFor,
  children,
  className,
}) => {
  // Only display error when showError is true
  const displayError = showError && error;

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <Label htmlFor={htmlFor} required={required} showError={!!displayError}>
          {label}
        </Label>
      )}
      {children}
      {(displayError || helperText) && (
        <HelperText error={!!displayError}>{displayError || helperText}</HelperText>
      )}
    </div>
  );
};

export default FormField;
