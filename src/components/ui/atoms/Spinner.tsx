import React from 'react';
import { cn } from '@/lib/utils';
import type { Size } from '../theme/types';

export interface SpinnerProps {
  size?: Size;
  className?: string;
  color?: 'gold' | 'neutral';
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-4 w-4 border-2',
  md: 'h-5 w-5 border-2',
  lg: 'h-6 w-6 border-[3px]',
};

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className,
  color = 'gold',
}) => {
  const colorClasses =
    color === 'gold'
      ? 'border-[#bfa76f] border-t-transparent'
      : 'border-neutral-400 border-t-transparent';

  return (
    <div
      className={cn(
        'inline-block animate-spin rounded-full',
        sizeClasses[size],
        colorClasses,
        className
      )}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default Spinner;
