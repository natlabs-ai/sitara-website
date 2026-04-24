import React from 'react';
import { cn } from '@/lib/utils';
import { GOLD } from '../theme/colors';

export interface SectionProps {
  title?: React.ReactNode;
  description?: string;
  titleColor?: 'gold' | 'neutral';
  children: React.ReactNode;
  className?: string;
  'data-testid'?: string;
}

export const Section: React.FC<SectionProps> = ({
  title,
  description,
  titleColor = 'neutral',
  children,
  className,
  'data-testid': dataTestId,
}) => {
  return (
    <section className={cn('rounded-2xl border border-neutral-800 bg-black/30 p-5', className)} data-testid={dataTestId}>
      {title && (
        <h3
          className="mb-3 text-sm font-semibold"
          style={titleColor === 'gold' ? { color: GOLD } : undefined}
        >
          {title}
        </h3>
      )}
      {description && <p className="mb-4 text-xs text-neutral-400 leading-snug">{description}</p>}
      {children}
    </section>
  );
};

export default Section;
