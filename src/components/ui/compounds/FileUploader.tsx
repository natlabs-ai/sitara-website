'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '../atoms/Button';
import { StatusIndicator } from './StatusIndicator';
import type { Status } from '../theme/types';

export interface FileUploaderProps {
  label: string;
  description?: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  loading?: boolean;
  onFileSelect: (files: File[]) => Promise<void> | void;
  maxSizeMB?: number;
  currentFileName?: string;
  status?: Status;
  statusMessage?: string;
  className?: string;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  label,
  description,
  accept,
  multiple = false,
  disabled = false,
  loading = false,
  onFileSelect,
  maxSizeMB,
  currentFileName,
  status = 'idle',
  statusMessage,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    // Validate file size if maxSizeMB is specified
    if (maxSizeMB) {
      const maxBytes = maxSizeMB * 1024 * 1024;
      const oversizedFiles = files.filter(file => file.size > maxBytes);

      if (oversizedFiles.length > 0) {
        alert(`File size must be less than ${maxSizeMB}MB`);
        e.target.value = ''; // Reset input
        return;
      }
    }

    await onFileSelect(files);
    e.target.value = ''; // Reset input for re-selection
  };

  const isDisabled = disabled || loading;

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={isDisabled}
        className="hidden"
        aria-label={label}
      />

      <div className="space-y-2">
        <Button
          variant="secondary"
          onClick={handleClick}
          disabled={isDisabled}
          loading={loading}
          fullWidth
        >
          {label}
        </Button>

        {description && (
          <p className="text-xs text-neutral-400">{description}</p>
        )}

        {currentFileName && (
          <p className="text-xs text-neutral-300">
            Current: <span className="font-medium">{currentFileName}</span>
          </p>
        )}

        {statusMessage && (
          <StatusIndicator
            status={status}
            loadingText={statusMessage}
            successText={statusMessage}
            errorText={statusMessage}
          />
        )}
      </div>
    </div>
  );
};

export default FileUploader;
