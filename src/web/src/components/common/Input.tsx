/**
 * @fileoverview Enterprise-grade input component with comprehensive validation and accessibility
 * @version 1.0.0
 * Dependencies:
 * - react: ^18.2.0
 * - @mui/material: ^5.0.0
 * - use-debounce: ^9.0.0
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { TextField } from '@mui/material';
import { styled } from '@mui/material/styles';
import { useDebounce } from 'use-debounce';
import { BaseComponentProps } from '../../types/common.types';
import { validateRequired, validateLength, sanitizeInput } from '../../utils/validation.utils';

// Enhanced styled TextField with RTL and accessibility support
const StyledTextField = styled(TextField, {
  shouldForwardProp: (prop) => prop !== 'rtl',
})<{ rtl?: boolean }>(({ theme, rtl }) => ({
  width: '100%',
  direction: rtl ? 'rtl' : 'ltr',
  '& .MuiInputBase-input': {
    padding: theme.spacing(1.5),
  },
  '& .MuiFormHelperText-root': {
    marginLeft: rtl ? theme.spacing(1.5) : 0,
    marginRight: rtl ? 0 : theme.spacing(1.5),
  },
  // Enhanced focus styles for accessibility
  '& .MuiOutlinedInput-root': {
    '&.Mui-focused': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.primary.main,
        borderWidth: 2,
      },
    },
    '&.Mui-error': {
      '& .MuiOutlinedInput-notchedOutline': {
        borderColor: theme.palette.error.main,
      },
    },
  },
}));

// Interface for Input component props
export interface InputProps extends BaseComponentProps {
  value: string | number;
  onChange: (value: string, isValid: boolean) => void;
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  error?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  rtl?: boolean;
}

/**
 * Enterprise-grade input component with comprehensive validation and accessibility
 */
export const Input: React.FC<InputProps> = ({
  value,
  onChange,
  onBlur,
  error,
  label,
  required = false,
  disabled = false,
  type = 'text',
  placeholder,
  minLength,
  maxLength,
  pattern,
  rtl = false,
  className,
  style,
  id,
  testId,
  ariaLabel,
  ariaDescribedBy,
}) => {
  // State management
  const [localError, setLocalError] = useState<string>('');
  const [touched, setTouched] = useState(false);
  const [debouncedValue] = useDebounce(value, 300);
  const inputRef = useRef<HTMLInputElement>(null);

  // Validation function
  const validateInput = useCallback((inputValue: string): string => {
    // Required field validation
    if (required) {
      const requiredError = validateRequired(inputValue, label || 'Field');
      if (requiredError) return requiredError;
    }

    // Length validation
    if ((minLength !== undefined || maxLength !== undefined) && typeof inputValue === 'string') {
      const lengthError = validateLength(
        inputValue,
        minLength || 0,
        maxLength || Number.MAX_SAFE_INTEGER,
        label || 'Field'
      );
      if (lengthError) return lengthError;
    }

    // Pattern validation
    if (pattern && typeof inputValue === 'string') {
      const regex = new RegExp(pattern);
      if (!regex.test(inputValue)) {
        return `${label || 'Field'} format is invalid`;
      }
    }

    return '';
  }, [required, minLength, maxLength, pattern, label]);

  // Effect for validation on value changes
  useEffect(() => {
    if (touched) {
      const validationError = validateInput(String(debouncedValue));
      setLocalError(validationError);
    }
  }, [debouncedValue, touched, validateInput]);

  // Change handler with security measures
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const sanitizedValue = sanitizeInput(event.target.value);
    setTouched(true);
    
    // Validate and update
    const validationError = validateInput(sanitizedValue);
    setLocalError(validationError);
    onChange(sanitizedValue, !validationError);
  }, [onChange, validateInput]);

  // Blur handler with final validation
  const handleBlur = useCallback((event: React.FocusEvent<HTMLInputElement>) => {
    setTouched(true);
    const validationError = validateInput(String(value));
    setLocalError(validationError);
    
    if (onBlur) {
      onBlur(event);
    }
  }, [onBlur, validateInput, value]);

  // Accessibility announcement for errors
  useEffect(() => {
    if (localError && inputRef.current) {
      const announcement = `${label || 'Field'} error: ${localError}`;
      inputRef.current.setAttribute('aria-invalid', 'true');
      inputRef.current.setAttribute('aria-errormessage', announcement);
    }
  }, [localError, label]);

  return (
    <StyledTextField
      ref={inputRef}
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      error={Boolean(error || localError)}
      helperText={error || localError}
      label={label}
      required={required}
      disabled={disabled}
      type={type}
      placeholder={placeholder}
      className={className}
      style={style}
      id={id}
      data-testid={testId}
      inputProps={{
        'aria-label': ariaLabel,
        'aria-describedby': ariaDescribedBy,
        'aria-required': required,
        'aria-invalid': Boolean(error || localError),
        maxLength: maxLength,
        minLength: minLength,
        pattern: pattern,
      }}
      rtl={rtl}
      FormHelperTextProps={{
        role: 'alert',
        'aria-live': 'polite',
      }}
    />
  );
};

export default Input;