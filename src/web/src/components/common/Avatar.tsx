import React, { useState, useMemo } from 'react';
import classNames from 'classnames';
import { BaseComponentProps } from '../types/common.types';

/**
 * Size variants for the Avatar component with corresponding dimensions
 */
export type AvatarSize = 'sm' | 'md' | 'lg';

/**
 * Props interface for the Avatar component
 */
export interface AvatarProps extends BaseComponentProps {
  /** URL of the avatar image */
  src?: string;
  /** User's full name for generating fallback initials */
  name: string;
  /** Size variant of the avatar */
  size?: AvatarSize;
  /** Alternative text for accessibility */
  alt?: string;
  /** ARIA role for accessibility */
  role?: string;
}

/**
 * Maps size variants to corresponding CSS classes
 */
const SIZE_CLASSES: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-base'
};

/**
 * Extracts initials from a user's full name
 * @param name - Full name of the user
 * @returns Formatted initials (max 2 characters)
 */
const getInitials = (name: string): string => {
  try {
    if (!name?.trim()) {
      return '?';
    }

    const nameParts = name.trim().split(/\s+/);
    const firstInitial = nameParts[0]?.[0] || '';
    const lastInitial = nameParts[nameParts.length - 1]?.[0] || '';

    // Handle cases where only one initial is available
    const initials = (lastInitial && nameParts.length > 1)
      ? `${firstInitial}${lastInitial}`
      : firstInitial;

    return initials.toUpperCase();
  } catch (error) {
    console.error('Error generating initials:', error);
    return '?';
  }
};

/**
 * Avatar component for displaying user profile images with fallback to initials
 * @param props - Avatar component props
 * @returns React component
 */
export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  className,
  style,
  alt,
  role = 'img',
  ...rest
}) => {
  const [hasError, setHasError] = useState<boolean>(false);

  // Memoize initials to prevent unnecessary recalculations
  const initials = useMemo(() => getInitials(name), [name]);

  // Memoize size classes for performance
  const sizeClasses = useMemo(() => SIZE_CLASSES[size], [size]);

  /**
   * Handles image loading errors with fallback to initials
   * @param event - Image error event
   */
  const handleImageError = (event: React.SyntheticEvent<HTMLImageElement>): void => {
    event.preventDefault();
    setHasError(true);
    console.warn(`Avatar image failed to load for user: ${name}`);
  };

  const containerClasses = classNames(
    'relative rounded-full overflow-hidden flex items-center justify-center bg-gray-200',
    sizeClasses,
    className
  );

  const initialsClasses = classNames(
    'font-medium text-gray-600',
    'select-none'
  );

  return (
    <div
      className={containerClasses}
      style={style}
      role={role}
      aria-label={alt || `Avatar for ${name}`}
      {...rest}
    >
      {src && !hasError ? (
        <img
          src={src}
          alt={alt || `Avatar for ${name}`}
          className="w-full h-full object-cover"
          onError={handleImageError}
          loading="lazy"
        />
      ) : (
        <span className={initialsClasses} aria-hidden="true">
          {initials}
        </span>
      )}
    </div>
  );
};

// Default export for convenient importing
export default Avatar;