import React from 'react';
import { cn } from '@/lib/utils';
import { Radio } from './Radio';
import type { Option } from '../theme/types';

export interface RadioGroupProps {
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
  disabled?: boolean;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  value,
  onChange,
  options,
  orientation = 'vertical',
  className,
  disabled,
}) => {
  return (
    <div
      className={cn(
        'flex gap-4',
        orientation === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {options.map((option) => (
        <Radio
          key={option.value}
          name={name}
          value={option.value}
          checked={value === option.value}
          onChange={() => onChange(option.value)}
          label={option.label}
          disabled={disabled || option.disabled}
        />
      ))}
    </div>
  );
};

export default RadioGroup;
