/**
 * @fileoverview A reusable button component implementing the design system's button styles
 * and interactions for the Sales & Intelligence Platform.
 * @version 1.0.0
 */

import React, { useCallback, useRef, useState } from 'react';
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps, LoadingState } from '../types/common.types';

// Button variants and sizes as readonly constants for type safety
const BUTTON_VARIANTS = ['primary', 'secondary', 'text'] as const;
const BUTTON_SIZES = ['small', 'medium', 'large'] as const;

type ButtonVariant = typeof BUTTON_VARIANTS[number];
type ButtonSize = typeof BUTTON_SIZES[number];

/**
 * Props interface for the Button component
 */
export interface ButtonProps extends BaseComponentProps {
  /** Button variant following design system */
  variant?: ButtonVariant;
  /** Button size following design system */
  size?: ButtonSize;
  /** Loading state indicator */
  isLoading?: boolean;
  /** Full width button style */
  fullWidth?: boolean;
  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset';
  /** Click event handler */
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  /** Button content */
  children: React.ReactNode;
  /** Test ID for testing */
  testId?: string;
}

/**
 * A reusable button component that implements the design system's button styles
 * and interactions with comprehensive state management and accessibility features.
 */
export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'medium',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  type = 'button',
  onClick,
  children,
  className,
  style,
  ariaLabel,
  testId,
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.IDLE);

  /**
   * Handles the ripple effect animation on button click
   */
  const createRippleEffect = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!button) return;

    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;

    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - rect.left - radius}px`;
    circle.style.top = `${event.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');

    const existingRipple = button.getElementsByClassName('ripple')[0];
    if (existingRipple) {
      existingRipple.remove();
    }

    button.appendChild(circle);
  }, []);

  /**
   * Handles button click events with loading state management
   * and error boundary protection
   */
  const handleClick = useCallback(async (event: React.MouseEvent<HTMLButtonElement>) => {
    if (disabled || loadingState === LoadingState.LOADING) {
      event.preventDefault();
      return;
    }

    try {
      createRippleEffect(event);

      if (isLoading) {
        setLoadingState(LoadingState.LOADING);
      }

      onClick?.(event);
    } catch (error) {
      setLoadingState(LoadingState.ERROR);
      console.error('Button click handler error:', error);
    }
  }, [disabled, isLoading, loadingState, onClick, createRippleEffect]);

  const buttonClasses = classNames(
    'button',
    `button--${variant}`,
    `button--${size}`,
    {
      'button--loading': loadingState === LoadingState.LOADING,
      'button--disabled': disabled,
      'button--full-width': fullWidth,
    },
    className
  );

  return (
    <button
      ref={buttonRef}
      type={type}
      className={buttonClasses}
      onClick={handleClick}
      disabled={disabled || loadingState === LoadingState.LOADING}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      aria-busy={loadingState === LoadingState.LOADING}
      data-testid={testId}
      style={style}
    >
      <span className="button__content">
        {loadingState === LoadingState.LOADING && (
          <span className="button__spinner" aria-hidden="true">
            <svg className="spinner" viewBox="0 0 24 24">
              <circle
                className="spinner__path"
                cx="12"
                cy="12"
                r="10"
                fill="none"
                strokeWidth="3"
              />
            </svg>
          </span>
        )}
        <span className={classNames('button__text', {
          'button__text--hidden': loadingState === LoadingState.LOADING
        })}>
          {children}
        </span>
      </span>
    </button>
  );
};

/**
 * Default props for the Button component
 */
Button.defaultProps = {
  variant: 'primary',
  size: 'medium',
  isLoading: false,
  disabled: false,
  fullWidth: false,
  type: 'button',
};

export default Button;