import React, { useCallback, useRef, useState } from 'react';
import classNames from 'classnames';
import { BaseComponentProps } from '../../types/common.types';

/**
 * Props interface for the RadioButton component
 * @extends BaseComponentProps
 */
export interface RadioButtonProps extends BaseComponentProps {
  /** Input name attribute for form submission */
  name: string;
  /** Value of the radio button */
  value: string;
  /** Controlled checked state */
  checked?: boolean;
  /** Label text to display next to the radio button */
  label?: string;
  /** Callback function when value changes */
  onChange?: (value: string) => void;
  /** Error state for validation feedback */
  error?: boolean;
  /** Required field indicator */
  required?: boolean;
  /** Accessibility label */
  ariaLabel?: string;
  /** ID of element that describes this radio button */
  ariaDescribedBy?: string;
  /** Default checked state for uncontrolled component */
  defaultChecked?: boolean;
}

/**
 * A reusable, accessible radio button component that follows the design system specifications
 * and supports form integration with comprehensive accessibility features.
 * 
 * @version 1.0.0
 * @example
 * <RadioButton
 *   name="options"
 *   value="option1"
 *   label="Option 1"
 *   onChange={(value) => console.log(value)}
 * />
 */
export const RadioButton: React.FC<RadioButtonProps> = ({
  name,
  value,
  checked,
  label,
  onChange,
  error,
  required,
  disabled,
  className,
  style,
  id,
  testId,
  ariaLabel,
  ariaDescribedBy,
  defaultChecked,
}) => {
  // Internal state for uncontrolled component
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  
  // Ref for the input element
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if component is controlled
  const isControlled = checked !== undefined;
  const isChecked = isControlled ? checked : internalChecked;

  /**
   * Handles the radio button change event
   * @param event - The change event
   */
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    event.preventDefault();
    const newValue = event.target.value;

    // Call onChange prop if provided
    onChange?.(newValue);

    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalChecked(true);
    }
  }, [onChange, isControlled]);

  /**
   * Handles keyboard navigation for accessibility
   * @param event - The keyboard event
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  // Generate unique ID if not provided
  const uniqueId = id || `radio-${name}-${value}`;

  // Compose class names
  const radioClasses = classNames(
    'radio-button',
    {
      'radio-button--checked': isChecked,
      'radio-button--error': error,
      'radio-button--disabled': disabled,
      'radio-button--required': required,
    },
    className
  );

  // Compose wrapper class names
  const wrapperClasses = classNames(
    'radio-button__wrapper',
    {
      'radio-button__wrapper--disabled': disabled,
      'radio-button__wrapper--error': error,
    }
  );

  return (
    <div className={wrapperClasses} style={style}>
      <input
        ref={inputRef}
        type="radio"
        id={uniqueId}
        name={name}
        value={value}
        checked={isChecked}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        required={required}
        className={radioClasses}
        data-testid={testId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-required={required}
        aria-invalid={error}
      />
      {label && (
        <label
          htmlFor={uniqueId}
          className="radio-button__label"
          data-testid={`${testId}-label`}
        >
          {label}
          {required && <span className="radio-button__required-indicator">*</span>}
        </label>
      )}
      {error && (
        <div
          className="radio-button__error"
          role="alert"
          data-testid={`${testId}-error`}
        >
          <span className="radio-button__error-icon" aria-hidden="true">!</span>
        </div>
      )}
    </div>
  );
};

// Default props
RadioButton.defaultProps = {
  disabled: false,
  error: false,
  required: false,
  testId: 'radio-button',
};

export default RadioButton;