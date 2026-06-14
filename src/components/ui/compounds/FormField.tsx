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
  /** Lay the label beside the control (same row) instead of above it, to save vertical space */
  inline?: boolean;
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
  inline = false,
}) => {
  // Only display error when showError is true
  const displayError = showError && error;

  if (inline) {
    return (
      <div className={cn('w-full', className)}>
        <div className="flex items-center gap-4">
          {label && (
            <Label
              htmlFor={htmlFor}
              required={required}
              showError={!!displayError}
              className="mb-0 w-48 shrink-0"
            >
              {label}
            </Label>
          )}
          <div className="min-w-0 flex-1">{children}</div>
        </div>
        {(displayError || helperText) && (
          <HelperText error={!!displayError}>{displayError || helperText}</HelperText>
        )}
      </div>
    );
  }

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
