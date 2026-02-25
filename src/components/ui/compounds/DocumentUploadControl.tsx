'use client';

import React, { useRef } from 'react';
import { cn } from '@/lib/utils';
import { Spinner } from '../atoms/Spinner';

/**
 * Upload control state machine:
 * - idle: No file uploaded yet. Button: "Choose file", enabled, neutral styling
 * - uploading: File selected, upload in progress. Button: "Uploading…", disabled, spinner
 * - success: Upload completed. Button: "Uploaded", enabled, gold text color
 * - error: Upload failed. Button: "Retry upload", enabled, error styling + error message
 */
export type DocumentUploadStatus = 'idle' | 'uploading' | 'success' | 'error';

export interface DocumentUploadControlProps {
  /** Current upload status */
  status: DocumentUploadStatus;
  /** Error message to display when status is 'error' */
  errorMessage?: string | null;
  /** Called when user selects a file */
  onFileSelect: (file: File) => void | Promise<void>;
  /** Called when user clicks remove (only shown when status is 'success') */
  onRemove?: () => void;
  /** File types to accept (e.g., "image/*,application/pdf") */
  accept?: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Whether the control is disabled (independent of status) */
  disabled?: boolean;
  /** Additional className for the container */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Show filename when uploaded */
  fileName?: string | null;
}

export const DocumentUploadControl: React.FC<DocumentUploadControlProps> = ({
  status,
  errorMessage,
  onFileSelect,
  onRemove,
  accept = 'image/*,application/pdf',
  maxSizeMB = 10,
  disabled = false,
  className,
  size = 'md',
  fileName,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (status !== 'uploading' && !disabled) {
      inputRef.current?.click();
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size
    if (maxSizeMB) {
      const maxBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxBytes) {
        alert(`File size must be less than ${maxSizeMB}MB`);
        e.target.value = '';
        return;
      }
    }

    await onFileSelect(file);
    e.target.value = ''; // Reset for re-selection of same file
  };

  // Determine button label based on state
  const getButtonLabel = () => {
    switch (status) {
      case 'uploading':
        return 'Uploading…';
      case 'success':
        return 'Uploaded';
      case 'error':
        return 'Retry upload';
      default:
        return 'Choose file';
    }
  };

  const isUploading = status === 'uploading';
  const isSuccess = status === 'success';
  const isError = status === 'error';
  const isDisabled = disabled || isUploading;

  // Size-based classes
  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  // Build button classes based on state
  const buttonClasses = cn(
    'inline-flex items-center justify-center gap-2 rounded-full border font-medium transition',
    sizeClasses,
    {
      // Idle state: neutral styling with gold hover
      'border-neutral-700 bg-black/70 text-neutral-100 hover:border-[#bfa76f]':
        !isSuccess && !isError && !isUploading,
      // Uploading state: muted, disabled look
      'border-neutral-700 bg-neutral-800 text-neutral-400 cursor-not-allowed opacity-70':
        isUploading,
      // Success state: same neutral bg, gold text only
      'border-neutral-700 bg-black/70 text-[#bfa76f] hover:border-[#bfa76f]':
        isSuccess,
      // Error state: error styling
      'border-red-500/50 bg-red-900/20 text-red-300 hover:border-red-500':
        isError,
      // General disabled state
      'opacity-50 cursor-not-allowed': isDisabled && !isUploading,
    }
  );

  return (
    <div className={cn('w-full', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        disabled={isDisabled}
        className="hidden"
      />

      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClick}
            disabled={isDisabled}
            className={buttonClasses}
          >
            {isUploading && <Spinner size="sm" color="neutral" />}
            {getButtonLabel()}
          </button>

          {/* Show filename next to button when available */}
          {fileName && !isError && (
            <span className="text-sm text-neutral-400 truncate max-w-[200px]">
              {fileName}
            </span>
          )}

          {/* Remove button - only shown when uploaded and onRemove provided */}
          {isSuccess && onRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="text-xs text-neutral-500 hover:text-red-400 underline-offset-2 hover:underline transition"
            >
              Remove
            </button>
          )}
        </div>

        {/* Error message - only shown in error state */}
        {isError && errorMessage && (
          <p className="text-xs text-red-400">
            {errorMessage}
          </p>
        )}
      </div>
    </div>
  );
};

export default DocumentUploadControl;
