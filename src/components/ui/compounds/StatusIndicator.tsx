import React from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '../atoms/Spinner';
import type { Status } from '../theme/types';

export interface StatusIndicatorProps {
  status: Status;
  loadingText?: string;
  successText?: string;
  errorText?: string;
  className?: string;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  status,
  loadingText = 'Loading...',
  successText = 'Success',
  errorText = 'Error',
  className,
}) => {
  if (status === 'idle') return null;

  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      {status === 'loading' && (
        <>
          <Spinner size="sm" />
          <span className="text-neutral-400">{loadingText}</span>
        </>
      )}
      {status === 'success' && (
        <>
          <span className="text-emerald-400">✓</span>
          <span className="text-emerald-300">{successText}</span>
        </>
      )}
      {status === 'error' && (
        <>
          <span className="text-red-400">✕</span>
          <span className="text-red-300">{errorText}</span>
        </>
      )}
    </div>
  );
};

export default StatusIndicator;
