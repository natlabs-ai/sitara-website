import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 text-neutral-600">{icon}</div>}
      <h3 className="text-base font-semibold text-neutral-300">{title}</h3>
      {description && <p className="mt-2 text-sm text-neutral-500">{description}</p>}
      {action && (
        <Button variant="secondary" onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
