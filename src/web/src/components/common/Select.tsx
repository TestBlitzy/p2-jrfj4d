/**
 * @fileoverview Enterprise-grade select/dropdown component with comprehensive features
 * @version 1.0.0
 * Dependencies:
 * - @mui/material: ^5.0.0
 * - react: ^18.2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { 
  Select as MuiSelect, 
  MenuItem, 
  FormControl, 
  FormHelperText,
  SelectChangeEvent,
  InputLabel,
  Box,
  Typography
} from '@mui/material';
import { SelectOption, BaseComponentProps } from '../../types/common.types';
import { validateRequired } from '../../utils/validation.utils';

/**
 * Enhanced props interface for the Select component
 */
interface SelectProps extends BaseComponentProps {
  /** Array of options to display in the select */
  options: SelectOption[];
  /** Currently selected value(s) */
  value: string | string[];
  /** Callback fired when selection changes */
  onChange: (value: string | string[]) => void;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the select is disabled */
  disabled?: boolean;
  /** Whether multiple selections are allowed */
  multiple?: boolean;
  /** Label text for the select */
  label?: string;
  /** Error message to display */
  error?: string;
  /** Helper text to display below the select */
  helperText?: string;
  /** Placeholder text when no selection */
  placeholder?: string;
  /** Minimum number of selections required (for multiple select) */
  minSelections?: number;
  /** Maximum number of selections allowed (for multiple select) */
  maxSelections?: number;
  /** Custom validation function */
  customValidation?: (value: string | string[]) => string;
  /** Whether to enable virtual scrolling for large option lists */
  virtualScroll?: boolean;
  /** ARIA properties for accessibility */
  aria?: {
    label?: string;
    description?: string;
    errorMessage?: string;
  };
}

/**
 * Enterprise-grade select component with comprehensive features
 */
const Select = React.forwardRef<HTMLDivElement, SelectProps>((props, ref) => {
  const {
    options,
    value,
    onChange,
    required = false,
    disabled = false,
    multiple = false,
    label,
    error,
    helperText,
    placeholder,
    minSelections,
    maxSelections,
    customValidation,
    virtualScroll = false,
    aria,
    className,
    style,
    id,
  } = props;

  // Local state for internal validation
  const [internalError, setInternalError] = useState<string>('');
  const [touched, setTouched] = useState<boolean>(false);

  // Memoized selected values for performance
  const selectedValues = useMemo(() => {
    return multiple ? (Array.isArray(value) ? value : []) : [value?.toString() || ''];
  }, [value, multiple]);

  /**
   * Validates the current selection
   */
  const validateSelection = useCallback((newValue: string | string[]): string => {
    // Required field validation
    if (required) {
      const requiredError = validateRequired(newValue, label || 'Selection');
      if (requiredError) return requiredError;
    }

    // Multiple select specific validations
    if (multiple) {
      const selections = Array.isArray(newValue) ? newValue : [];
      
      if (minSelections && selections.length < minSelections) {
        return `Please select at least ${minSelections} options`;
      }

      if (maxSelections && selections.length > maxSelections) {
        return `Please select no more than ${maxSelections} options`;
      }
    }

    // Custom validation if provided
    if (customValidation) {
      const customError = customValidation(newValue);
      if (customError) return customError;
    }

    return '';
  }, [required, multiple, minSelections, maxSelections, customValidation, label]);

  /**
   * Handles selection changes with validation
   */
  const handleChange = useCallback((event: SelectChangeEvent<string | string[]>) => {
    event.preventDefault();
    setTouched(true);

    const newValue = event.target.value;
    const validationError = validateSelection(newValue);
    setInternalError(validationError);

    if (!validationError) {
      onChange(newValue);
    }
  }, [onChange, validateSelection]);

  // Validate on mount if required
  useEffect(() => {
    if (required) {
      const validationError = validateSelection(value);
      setInternalError(validationError);
    }
  }, [required, value, validateSelection]);

  // Compute display error
  const displayError = error || (touched ? internalError : '');

  return (
    <FormControl
      ref={ref}
      className={className}
      style={style}
      error={!!displayError}
      disabled={disabled}
      required={required}
      fullWidth
    >
      {label && (
        <InputLabel id={`${id}-label`} error={!!displayError}>
          {label}
        </InputLabel>
      )}

      <MuiSelect
        id={id}
        labelId={`${id}-label`}
        value={value}
        onChange={handleChange}
        multiple={multiple}
        displayEmpty
        renderValue={(selected) => {
          if (!selected || (Array.isArray(selected) && selected.length === 0)) {
            return <Typography color="textSecondary">{placeholder || 'Select...'}</Typography>;
          }
          
          const selectedLabels = (Array.isArray(selected) ? selected : [selected])
            .map(val => options.find(opt => opt.value.toString() === val)?.label)
            .filter(Boolean)
            .join(', ');
            
          return selectedLabels;
        }}
        aria-label={aria?.label}
        aria-describedby={`${id}-helper-text`}
        aria-errormessage={displayError ? `${id}-error-text` : undefined}
      >
        {options.map((option) => (
          <MenuItem
            key={option.value}
            value={option.value.toString()}
            disabled={option.disabled}
          >
            <Box display="flex" alignItems="center">
              {option.icon && (
                <Box mr={1} display="flex" alignItems="center">
                  {option.icon}
                </Box>
              )}
              <Box>
                <Typography variant="body1">{option.label}</Typography>
                {option.description && (
                  <Typography variant="caption" color="textSecondary">
                    {option.description}
                  </Typography>
                )}
              </Box>
            </Box>
          </MenuItem>
        ))}
      </MuiSelect>

      {(helperText || displayError) && (
        <FormHelperText
          id={displayError ? `${id}-error-text` : `${id}-helper-text`}
          error={!!displayError}
        >
          {displayError || helperText}
        </FormHelperText>
      )}
    </FormControl>
  );
});

Select.displayName = 'Select';

export default Select;