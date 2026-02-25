import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  children: React.ReactNode;
  hoverable?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  hoverable = false,
  className,
  onClick,
}) => {
  const isClickable = !!onClick;

  return (
    <div
      className={cn(
        'rounded-xl border border-neutral-800 bg-black/40 p-3',
        hoverable && 'transition-colors hover:bg-black/50',
        isClickable && 'cursor-pointer',
        className
      )}
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {children}
    </div>
  );
};

export default Card;
