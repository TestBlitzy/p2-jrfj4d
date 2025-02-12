/**
 * @fileoverview A reusable progress bar component for visualizing completion states
 * with enhanced accessibility and customization options.
 * @version 1.0.0
 */

import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import { BaseComponentProps } from '../../types/common.types';

/**
 * Props interface for the ProgressBar component
 */
interface ProgressBarProps extends BaseComponentProps {
  /** Current progress value (must be between 0 and max) */
  value: number;
  /** Maximum progress value (must be greater than 0) */
  max: number;
  /** Optional label text for progress description */
  label?: string;
  /** Color theme of the progress bar */
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  /** Whether to show percentage label overlay */
  showLabel?: boolean;
  /** Size variant of the progress bar */
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Calculates the width percentage for progress bar fill
 * @param value Current progress value
 * @param max Maximum progress value
 * @returns Percentage string for width style
 */
const calculateProgressWidth = (value: number, max: number): string => {
  const validValue = Math.max(0, Math.min(value, max));
  const validMax = Math.max(1, max);
  const percentage = Math.round((validValue / validMax) * 100);
  return `${percentage}%`;
};

/**
 * ProgressBar component that renders an accessible and customizable progress bar
 */
export const ProgressBar: React.FC<ProgressBarProps> = React.memo(({
  value,
  max,
  label,
  color = 'primary',
  showLabel = false,
  size = 'md',
  className,
  style,
  id,
  testId,
  ariaLabel,
}) => {
  // Calculate progress width
  const progressWidth = calculateProgressWidth(value, max);
  
  // Calculate percentage for label
  const percentage = Math.round((value / max) * 100);

  // Compose class names
  const containerClasses = classNames(
    'progress-bar-container',
    `progress-bar-${color}`,
    `progress-bar-${size}`,
    {
      'progress-bar-with-label': showLabel || label,
    },
    className
  );

  const fillClasses = classNames(
    'progress-bar-fill',
    `progress-bar-fill-${color}`,
    {
      'progress-bar-fill-animated': !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    }
  );

  return (
    <div
      className={containerClasses}
      style={{
        ...style,
        '--progress-width': progressWidth,
      } as React.CSSProperties}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={ariaLabel || label}
      id={id}
      data-testid={testId}
    >
      <div 
        className={fillClasses}
        style={{
          width: progressWidth,
        }}
      />
      
      {(showLabel || label) && (
        <div className="progress-bar-label">
          {label ? (
            <span className="progress-bar-text">{label}</span>
          ) : (
            <span className="progress-bar-percentage">{percentage}%</span>
          )}
        </div>
      )}
    </div>
  );
});

// Display name for debugging
ProgressBar.displayName = 'ProgressBar';

// Default export
export default ProgressBar;

/**
 * CSS styles are expected to be defined in a separate stylesheet:
 * 
 * .progress-bar-container {
 *   position: relative;
 *   width: 100%;
 *   background-color: var(--progress-bar-background);
 *   border-radius: 0.25rem;
 *   overflow: hidden;
 * }
 * 
 * .progress-bar-sm { height: 0.5rem; }
 * .progress-bar-md { height: 1rem; }
 * .progress-bar-lg { height: 1.5rem; }
 * 
 * .progress-bar-fill {
 *   height: 100%;
 *   transition: width 0.3s ease;
 * }
 * 
 * .progress-bar-fill-animated {
 *   transition: width 0.3s ease;
 * }
 * 
 * .progress-bar-label {
 *   position: absolute;
 *   top: 50%;
 *   left: 50%;
 *   transform: translate(-50%, -50%);
 *   color: var(--progress-bar-label-color);
 *   font-size: 0.875rem;
 *   font-weight: 500;
 * }
 */