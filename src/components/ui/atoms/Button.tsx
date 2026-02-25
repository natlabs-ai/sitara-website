import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from './Spinner';
import type { ButtonVariant, Size } from '../theme/types';
import { GOLD } from '../theme/colors';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  className,
  type = 'button',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';

  const variantClasses: Record<ButtonVariant, string> = {
    primary: 'text-black hover:opacity-90',
    secondary: 'border border-neutral-700 bg-neutral-900 text-neutral-100 hover:bg-neutral-800',
    ghost: 'border border-transparent text-neutral-100 hover:bg-neutral-900',
    danger: 'bg-red-600 text-white hover:bg-red-700',
  };

  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        baseClasses,
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className
      )}
      style={variant === 'primary' ? { backgroundColor: GOLD } : undefined}
      {...props}
    >
      {loading && <Spinner size="sm" color={variant === 'primary' ? 'neutral' : 'gold'} />}
      {children}
    </button>
  );
};

export default Button;
