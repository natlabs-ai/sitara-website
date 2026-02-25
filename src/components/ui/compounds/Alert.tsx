import React from 'react';
import { cn } from '@/lib/utils';
import type { ColorVariant } from '../theme/types';

export interface AlertProps {
  variant?: Exclude<ColorVariant, 'default'>;
  title?: string;
  children: React.ReactNode;
  onClose?: () => void;
  className?: string;
}

const variantClasses: Record<Exclude<ColorVariant, 'default'>, string> = {
  success: 'border-emerald-500/40 bg-emerald-900/15 text-emerald-100/90',
  warning: 'border-amber-500/40 bg-amber-900/15 text-amber-100/90',
  error: 'border-red-500/40 bg-red-900/15 text-red-100/90',
  info: 'border-blue-500/40 bg-blue-900/15 text-blue-100/90',
};

export const Alert: React.FC<AlertProps> = ({
  variant = 'info',
  title,
  children,
  onClose,
  className,
}) => {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 text-xs',
        variantClasses[variant],
        className
      )}
      role="alert"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          {title && <div className="mb-1 font-semibold">{title}</div>}
          <div>{children}</div>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-current opacity-70 hover:opacity-100 transition"
            aria-label="Close alert"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
