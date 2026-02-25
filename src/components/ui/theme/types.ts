// Shared TypeScript types for UI components

export type Size = 'sm' | 'md' | 'lg';

export type ColorVariant = 'default' | 'success' | 'warning' | 'error' | 'info';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export interface BaseComponentProps {
  className?: string;
  id?: string;
}

export interface FormElementProps extends BaseComponentProps {
  disabled?: boolean;
  required?: boolean;
  error?: string;
  helperText?: string;
  name?: string;
}

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
}

export type Status = 'idle' | 'loading' | 'success' | 'error';

export type UploadStatus = 'idle' | 'uploading' | 'extracting' | 'success' | 'error';
