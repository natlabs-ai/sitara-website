import React from 'react';
import { cn } from '@/lib/utils';

export interface HelperTextProps {
  children: React.ReactNode;
  error?: boolean;
  className?: string;
}

export const HelperText: React.FC<HelperTextProps> = ({
  children,
  error = false,
  className,
}) => {
  return (
    <p
      className={cn(
        'mt-1 text-xs',
        error ? 'text-red-400' : 'text-neutral-400',
        className
      )}
    >
      {children}
    </p>
  );
};

export default HelperText;
