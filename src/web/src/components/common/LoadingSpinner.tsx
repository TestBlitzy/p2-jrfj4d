import React from 'react';
import { spinner } from '../../styles/animations.scss';

interface LoadingSpinnerProps {
  /**
   * Size of the spinner in pixels
   * @default 24
   */
  size?: number;
  
  /**
   * Color of the spinner, supports CSS color values and theme tokens
   * @default 'currentColor'
   */
  color?: string;
  
  /**
   * Additional CSS classes for custom styling
   */
  className?: string;
  
  /**
   * Accessible label for screen readers
   * @default 'Loading...'
   */
  ariaLabel?: string;
}

/**
 * A reusable loading spinner component that provides visual feedback during 
 * asynchronous operations. Features hardware-accelerated animations,
 * accessibility support, RTL compatibility, and reduced motion preferences.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 24,
  color = 'currentColor',
  className = '',
  ariaLabel = 'Loading...'
}) => {
  // Calculate viewBox dimensions based on size
  const viewBoxSize = 24; // Base size for SVG viewBox
  const strokeWidth = viewBoxSize * 0.125; // Proportional stroke width
  const radius = (viewBoxSize - strokeWidth) / 2;
  
  return (
    <svg
      className={`${spinner} ${className}`}
      width={size}
      height={size}
      viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
      xmlns="http://www.w3.org/2000/svg"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      // Support both LTR and RTL layouts
      style={{
        transformOrigin: '50% 50%',
        color: color
      }}
    >
      {/* Spinner track */}
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        opacity={0.2}
      />
      {/* Spinner indicator */}
      <circle
        cx={viewBoxSize / 2}
        cy={viewBoxSize / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        // Create spinning effect with partial circle
        strokeDasharray={`${viewBoxSize * 1.25} ${viewBoxSize * 2}`}
      />
    </svg>
  );
};

export default LoadingSpinner;