import React, { useCallback, useEffect, useRef, useState } from 'react';
import { styled } from '@mui/material/styles';
import { useFormContext, Controller } from 'react-hook-form';
import Tooltip from '@mui/material/Tooltip';
import CircularProgress from '@mui/material/CircularProgress';
import useTheme from '../../hooks/useTheme';
import { COLORS, SPACING, TYPOGRAPHY } from '../../constants/theme.constants';
import type { BaseComponentProps } from '../../types/common.types';

// Constants for animation durations
const ANIMATION_DURATION = 150;
const RIPPLE_DURATION = 400;

interface CheckboxProps extends BaseComponentProps {
  checked?: boolean;
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
  name?: string;
  value?: string;
  error?: boolean;
  errorMessage?: string;
  indeterminate?: boolean;
  icon?: React.ReactNode;
  checkedIcon?: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  tooltip?: string;
  loading?: boolean;
}

// Size mappings for different checkbox sizes
const sizeMap = {
  small: {
    size: 16,
    borderWidth: 1.5,
  },
  medium: {
    size: 20,
    borderWidth: 2,
  },
  large: {
    size: 24,
    borderWidth: 2,
  },
};

// Styled checkbox container with enhanced accessibility and animations
const StyledCheckboxContainer = styled('div')<{ size: string; disabled?: boolean }>(
  ({ theme, size, disabled }) => ({
    display: 'inline-flex',
    alignItems: 'center',
    position: 'relative',
    cursor: disabled ? 'not-allowed' : 'pointer',
    userSelect: 'none',
    padding: SPACING.SIZES.xs,
    opacity: disabled ? 0.5 : 1,
    transition: theme.transitions.create(['opacity', 'background-color'], {
      duration: ANIMATION_DURATION,
    }),
  })
);

// Styled checkbox input with theme integration
const StyledCheckbox = styled('input')<{
  size: string;
  error?: boolean;
  indeterminate?: boolean;
}>(({ theme, size, error, indeterminate }) => {
  const sizeConfig = sizeMap[size as keyof typeof sizeMap];
  const { theme: currentTheme } = useTheme();
  
  return {
    appearance: 'none',
    position: 'relative',
    width: sizeConfig.size,
    height: sizeConfig.size,
    margin: 0,
    border: `${sizeConfig.borderWidth}px solid ${
      error ? COLORS.ERROR.main : currentTheme.palette.primary.main
    }`,
    borderRadius: theme.shape.borderRadius / 2,
    backgroundColor: 'transparent',
    cursor: 'inherit',
    transition: theme.transitions.create(
      ['background-color', 'border-color', 'box-shadow'],
      { duration: ANIMATION_DURATION }
    ),

    '&:checked, &[data-indeterminate="true"]': {
      backgroundColor: error ? COLORS.ERROR.main : currentTheme.palette.primary.main,
      borderColor: 'transparent',

      '&::after': {
        content: '""',
        position: 'absolute',
        display: 'block',
        top: '50%',
        left: '50%',
        transform: indeterminate 
          ? 'translate(-50%, -50%)' 
          : 'translate(-50%, -50%) rotate(45deg)',
        width: indeterminate ? '60%' : '30%',
        height: indeterminate ? '2px' : '60%',
        backgroundColor: currentTheme.palette.common.white,
      },
    },

    '&:focus-visible': {
      outline: 'none',
      boxShadow: `0 0 0 4px ${currentTheme.palette.primary.main}33`,
    },

    '&:hover:not(:disabled)': {
      borderColor: error ? COLORS.ERROR.light : currentTheme.palette.primary.light,
    },
  };
});

// Styled label with typography integration
const StyledLabel = styled('label')<{ disabled?: boolean }>(({ theme, disabled }) => ({
  marginLeft: SPACING.SIZES.sm,
  color: disabled ? theme.palette.text.disabled : theme.palette.text.primary,
  fontSize: TYPOGRAPHY.FONT_SIZE.md,
  fontFamily: TYPOGRAPHY.FONT_FAMILY.primary,
  cursor: 'inherit',
}));

// Error message styling
const StyledError = styled('span')(({ theme }) => ({
  color: theme.palette.error.main,
  fontSize: TYPOGRAPHY.FONT_SIZE.sm,
  marginTop: SPACING.SIZES.xs,
  display: 'block',
}));

export const Checkbox: React.FC<CheckboxProps> = React.memo(({
  checked = false,
  onChange,
  disabled = false,
  label,
  name,
  value,
  className,
  ariaLabel,
  error = false,
  errorMessage,
  indeterminate = false,
  size = 'medium',
  color,
  tooltip,
  loading = false,
  testId,
}) => {
  const [ripple, setRipple] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const formContext = useFormContext();

  // Handle indeterminate state
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
      inputRef.current.setAttribute('data-indeterminate', String(indeterminate));
    }
  }, [indeterminate]);

  // Enhanced change handler with form context integration
  const handleChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled || loading) return;

    const newChecked = event.target.checked;
    
    // Update form context if available
    if (formContext && name) {
      formContext.setValue(name, newChecked, { shouldValidate: true });
    }

    // Call onChange prop
    onChange?.(newChecked, event);

    // Trigger ripple effect
    setRipple(true);
    setTimeout(() => setRipple(false), RIPPLE_DURATION);
  }, [disabled, loading, onChange, name, formContext]);

  // Keyboard handling for accessibility
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      inputRef.current?.click();
    }
  }, []);

  const checkbox = (
    <StyledCheckboxContainer
      size={size}
      disabled={disabled}
      className={className}
      data-testid={testId}
      onKeyDown={handleKeyDown}
    >
      {loading && (
        <CircularProgress
          size={sizeMap[size].size}
          style={{
            position: 'absolute',
            left: SPACING.SIZES.xs,
            color: color || COLORS.PRIMARY.main,
          }}
        />
      )}
      <StyledCheckbox
        ref={inputRef}
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={disabled || loading}
        name={name}
        value={value}
        aria-label={ariaLabel || label}
        aria-checked={indeterminate ? 'mixed' : checked}
        aria-disabled={disabled}
        size={size}
        error={error}
        indeterminate={indeterminate}
        data-ripple={ripple}
      />
      {label && <StyledLabel disabled={disabled}>{label}</StyledLabel>}
      {error && errorMessage && <StyledError>{errorMessage}</StyledError>}
    </StyledCheckboxContainer>
  );

  // Wrap with tooltip if provided
  return tooltip ? (
    <Tooltip title={tooltip} arrow>
      {checkbox}
    </Tooltip>
  ) : checkbox;
});

Checkbox.displayName = 'Checkbox';

export default Checkbox;