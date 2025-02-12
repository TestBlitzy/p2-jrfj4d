/**
 * @fileoverview A reusable Badge component for displaying status indicators, labels, and counts
 * @version 1.0.0
 */

import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps } from '../../types/common.types';

/**
 * Props interface for the Badge component
 */
export interface BadgeProps extends BaseComponentProps {
  /** Visual style variant of the badge */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info';
  /** Size variant of the badge */
  size?: 'small' | 'medium' | 'large';
  /** Content to be displayed inside the badge */
  children: React.ReactNode;
  /** Enables rounded corners */
  rounded?: boolean;
  /** Enables animation effects */
  animated?: boolean;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
  /** Dark mode theme support */
  isDarkMode?: boolean;
}

/**
 * A versatile Badge component for displaying status indicators, labels, and counts
 */
export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  size = 'medium',
  children,
  rounded = false,
  animated = false,
  className,
  style,
  ariaLabel,
  isDarkMode = false,
  testId,
}) => {
  // Base styles for the badge
  const baseStyles = 'inline-flex items-center justify-center font-medium';

  // Size-specific styles
  const sizeStyles = {
    small: 'px-2 py-0.5 text-xs',
    medium: 'px-3 py-1 text-sm',
    large: 'px-4 py-1.5 text-base',
  };

  // Variant-specific styles with dark mode support
  const variantStyles = {
    primary: isDarkMode
      ? 'bg-blue-600 text-white'
      : 'bg-blue-100 text-blue-800',
    secondary: isDarkMode
      ? 'bg-gray-600 text-white'
      : 'bg-gray-100 text-gray-800',
    success: isDarkMode
      ? 'bg-green-600 text-white'
      : 'bg-green-100 text-green-800',
    danger: isDarkMode
      ? 'bg-red-600 text-white'
      : 'bg-red-100 text-red-800',
    warning: isDarkMode
      ? 'bg-yellow-600 text-white'
      : 'bg-yellow-100 text-yellow-800',
    info: isDarkMode
      ? 'bg-indigo-600 text-white'
      : 'bg-indigo-100 text-indigo-800',
  };

  // Animation styles
  const animationStyles = animated
    ? 'transition-all duration-200 ease-in-out hover:opacity-90 active:opacity-80'
    : '';

  // Border radius styles
  const roundedStyles = rounded ? 'rounded-full' : 'rounded';

  // Compose class names
  const badgeClasses = classNames(
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    animationStyles,
    roundedStyles,
    className
  );

  return (
    <span
      className={badgeClasses}
      style={style}
      role="status"
      aria-label={ariaLabel}
      data-testid={testId}
    >
      {children}
    </span>
  );
};

// Default export for convenient importing
export default Badge;