/**
 * @fileoverview A secure and feature-rich file upload component with drag-and-drop support,
 * progress tracking, and error recovery capabilities.
 * @version 1.0.0
 */

import React, { useCallback, useRef, useState } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps } from '../../types/common.types';
import { Button } from './Button';
import { ProgressBar } from './ProgressBar';

// Constants for file upload configuration
const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const DEFAULT_ACCEPT_TYPES = ['.jpg', '.jpeg', '.png', '.pdf', '.doc', '.docx', '.xls', '.xlsx'];
const DEFAULT_CHUNK_SIZE = 1024 * 1024; // 1MB chunks
const MAX_RETRY_ATTEMPTS = 3;
const UPLOAD_TIMEOUT = 30000; // 30 seconds

/**
 * Interface for file upload errors with detailed information
 */
export interface FileUploadError {
  code: string;
  message: string;
  details: any;
  retryable: boolean;
}

/**
 * Props interface for the FileUpload component
 */
export interface FileUploadProps extends BaseComponentProps {
  onFileSelect: (file: File) => void;
  onUploadStart: (file: File) => void;
  onUploadProgress: (progress: number) => void;
  onUploadComplete: (response: any) => void;
  onError: (error: FileUploadError) => void;
  accept?: string[];
  maxSize?: number;
  multiple?: boolean;
  disabled?: boolean;
  validateContent?: (file: File) => Promise<boolean>;
  uploadEndpoint: string;
  retryAttempts?: number;
  chunkSize?: number;
  encryption?: boolean;
}

/**
 * A comprehensive file upload component with security features and progress tracking
 */
export const FileUpload: React.FC<FileUploadProps> = ({
  onFileSelect,
  onUploadStart,
  onUploadProgress,
  onUploadComplete,
  onError,
  accept = DEFAULT_ACCEPT_TYPES,
  maxSize = DEFAULT_MAX_SIZE,
  multiple = false,
  disabled = false,
  validateContent,
  uploadEndpoint,
  retryAttempts = MAX_RETRY_ATTEMPTS,
  chunkSize = DEFAULT_CHUNK_SIZE,
  encryption = false,
  className,
  style,
  testId,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAbortController = useRef<AbortController | null>(null);

  /**
   * Validates file security and content
   */
  const validateFile = async (file: File): Promise<boolean> => {
    try {
      // Validate file name for security
      const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      if (safeFileName !== file.name) {
        throw new Error('Invalid file name');
      }

      // Validate file type
      const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!accept.includes(fileExtension)) {
        throw new Error('Unsupported file type');
      }

      // Validate file size
      if (file.size > maxSize) {
        throw new Error('File size exceeds limit');
      }

      // Custom content validation if provided
      if (validateContent) {
        const isValid = await validateContent(file);
        if (!isValid) {
          throw new Error('Content validation failed');
        }
      }

      return true;
    } catch (error) {
      onError({
        code: 'VALIDATION_ERROR',
        message: error instanceof Error ? error.message : 'File validation failed',
        details: error,
        retryable: false,
      });
      return false;
    }
  };

  /**
   * Handles file selection from input or drop
   */
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    let files: FileList | null = null;
    if (event instanceof DragEvent) {
      files = event.dataTransfer?.files || null;
    } else {
      files = event.target.files;
    }

    if (!files || files.length === 0) return;

    const file = files[0];
    const isValid = await validateFile(file);

    if (isValid) {
      setCurrentFile(file);
      onFileSelect(file);
      handleUpload(file);
    }

    // Reset input for repeated selections
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handles the file upload process with chunking and retry logic
   */
  const handleUpload = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);
    onUploadStart(file);

    const chunks = Math.ceil(file.size / chunkSize);
    let currentChunk = 0;
    let retries = 0;

    uploadAbortController.current = new AbortController();

    try {
      while (currentChunk < chunks && retries < retryAttempts) {
        const start = currentChunk * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk);
        formData.append('chunk', currentChunk.toString());
        formData.append('chunks', chunks.toString());
        formData.append('filename', file.name);

        if (encryption) {
          // Add encryption metadata if enabled
          formData.append('encrypted', 'true');
        }

        try {
          const response = await fetch(uploadEndpoint, {
            method: 'POST',
            body: formData,
            signal: uploadAbortController.current.signal,
            headers: {
              'X-Upload-ID': `${file.name}-${Date.now()}`,
            },
          });

          if (!response.ok) throw new Error(`Upload failed: ${response.statusText}`);

          currentChunk++;
          const progress = (currentChunk / chunks) * 100;
          setUploadProgress(progress);
          onUploadProgress(progress);
          retries = 0; // Reset retries on successful chunk upload
        } catch (error) {
          if (error instanceof Error && error.name === 'AbortError') {
            throw error;
          }
          retries++;
          await new Promise(resolve => setTimeout(resolve, 1000 * retries));
        }
      }

      if (currentChunk === chunks) {
        const response = await fetch(`${uploadEndpoint}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filename: file.name,
            chunks,
          }),
        });

        const result = await response.json();
        onUploadComplete(result);
      } else {
        throw new Error('Upload failed after maximum retries');
      }
    } catch (error) {
      onError({
        code: 'UPLOAD_ERROR',
        message: error instanceof Error ? error.message : 'Upload failed',
        details: error,
        retryable: true,
      });
    } finally {
      setIsUploading(false);
      uploadAbortController.current = null;
    }
  };

  /**
   * Drag and drop event handlers
   */
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      handleFileSelect(e);
    }
  }, [disabled]);

  /**
   * Cancels ongoing upload
   */
  const handleCancel = useCallback(() => {
    uploadAbortController.current?.abort();
    setIsUploading(false);
    setUploadProgress(0);
    setCurrentFile(null);
  }, []);

  const containerClasses = classNames(
    'file-upload',
    {
      'file-upload--dragging': isDragging,
      'file-upload--disabled': disabled,
      'file-upload--uploading': isUploading,
    },
    className
  );

  return (
    <div
      className={containerClasses}
      style={style}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid={testId}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="file-upload__input"
        onChange={handleFileSelect}
        accept={accept.join(',')}
        multiple={multiple}
        disabled={disabled || isUploading}
      />

      <div className="file-upload__content">
        <div className="file-upload__icon">
          {isDragging ? '📂' : '📁'}
        </div>
        
        <div className="file-upload__text">
          {isDragging ? (
            'Drop files here'
          ) : (
            <>
              Drag & drop files or
              <Button
                variant="text"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled || isUploading}
              >
                browse
              </Button>
            </>
          )}
        </div>

        {currentFile && (
          <div className="file-upload__file">
            <span className="file-upload__filename">{currentFile.name}</span>
            <span className="file-upload__filesize">
              {Math.round(currentFile.size / 1024)} KB
            </span>
          </div>
        )}

        {isUploading && (
          <div className="file-upload__progress">
            <ProgressBar
              value={uploadProgress}
              max={100}
              size="sm"
              color="primary"
              showLabel
            />
            <Button
              variant="secondary"
              size="small"
              onClick={handleCancel}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileUpload;