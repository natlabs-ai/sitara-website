import React from 'react';
import { cn } from '@/lib/utils';
import type { ColorVariant, Size } from '../theme/types';

export interface BadgeProps {
  variant?: ColorVariant;
  size?: Exclude<Size, 'lg'>;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<ColorVariant, string> = {
  default: 'border-neutral-800 bg-neutral-900 text-neutral-300',
  success: 'border-emerald-500/40 bg-emerald-900/20 text-emerald-300',
  warning: 'border-amber-500/40 bg-amber-900/20 text-amber-300',
  error: 'border-red-500/40 bg-red-900/20 text-red-300',
  info: 'border-blue-500/40 bg-blue-900/20 text-blue-300',
};

const sizeClasses: Record<Exclude<Size, 'lg'>, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-1 text-xs',
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'default',
  size = 'md',
  children,
  className,
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-medium',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};

export default Badge;
